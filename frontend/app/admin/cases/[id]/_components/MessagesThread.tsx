"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Send, Paperclip, Mic, Square, X, FileText, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { sendMessageAction } from "@/lib/actions/message";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

// Mirrors the backend allowlist (message-attachment-upload.middleware.ts) —
// duplicated here only for the file picker's `accept` hint, which is a UX
// nicety, not a security boundary. The actual enforcement is server-side;
// a rejected file still comes back as a clear error from the upload.
const ATTACHMENT_ACCEPT =
    "image/jpeg,image/png,image/webp,image/gif,image/heic,application/pdf,application/msword," +
    ".docx,application/vnd.ms-excel,.xlsx,application/vnd.ms-powerpoint,.pptx,text/plain,text/csv";

const MAX_RECORDING_SECONDS = 300; // 5 minutes — a voice note, not a deposition

interface AttachmentRow {
    _id: string;
    originalName: string;
    mimeType: string;
    size: number;
    kind: "image" | "document" | "audio" | "other";
    duration?: number;
}

interface MessageRow {
    _id: string;
    content: string;
    sender: { _id: string; firstName: string; lastName: string } | string;
    createdAt: string;
    attachments?: AttachmentRow[];
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60)
        .toString()
        .padStart(2, "0");
    return `${m}:${s}`;
}

function attachmentUrl(messageId: string, attachmentId: string) {
    return `/api/messages/${messageId}/attachments/${attachmentId}/download`;
}

/** One attachment inside a sent message bubble — image thumbnail, inline
 * audio player, or a download chip for everything else (documents). */
function AttachmentBubbleContent({
    attachment,
    url,
    isMine,
}: {
    attachment: AttachmentRow;
    url: string;
    isMine: boolean;
}) {
    if (attachment.kind === "image") {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- attachments
                    are user-uploaded, arbitrary-origin-proxied bytes, not a
                    build-time-known asset next/image can optimize. */}
                <img
                    src={url}
                    alt={attachment.originalName}
                    className="max-w-full max-h-64 rounded-lg object-cover cursor-pointer"
                />
            </a>
        );
    }

    if (attachment.kind === "audio") {
        return (
            <div className="min-w-[220px]">
                <audio controls src={url} className="w-full h-10" />
                {attachment.duration != null && (
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-white/70" : "text-slate-400"}`}>
                        Voice note · {formatDuration(attachment.duration)}
                    </p>
                )}
            </div>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.originalName}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition ${
                isMine ? "bg-white/15 hover:bg-white/25" : "bg-white hover:bg-slate-50 border border-slate-200"
            }`}
        >
            <FileText className="w-7 h-7 flex-shrink-0" />
            <span className="min-w-0">
                <span className="block text-xs font-medium truncate max-w-[180px]">{attachment.originalName}</span>
                <span className={`block text-[10px] ${isMine ? "text-white/70" : "text-slate-400"}`}>
                    {formatBytes(attachment.size)}
                </span>
            </span>
        </a>
    );
}

// Three-dot "typing…" indicator, animated entirely in JS via inline styles —
// deliberately not a CSS keyframe/Tailwind utility. A prior version used
// Tailwind's `[animation-delay:-0.3s]` arbitrary-property syntax, the only
// place in the codebase using it, and it broke the page's generated
// stylesheet the moment it rendered (this project runs Tailwind CSS 4,
// which parses arbitrary values differently than v3). This has zero
// dependency on how any CSS gets generated, so it can't repeat that failure
// mode regardless of Tailwind version.
function TypingDots() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => (t + 1) % 12), 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[0, 1, 2].map((i) => {
                const active = tick % 4 === i;
                return (
                    <span
                        key={i}
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: "#94a3b8",
                            display: "inline-block",
                            transform: active ? "translateY(-3px)" : "translateY(0)",
                            transition: "transform 150ms ease",
                        }}
                    />
                );
            })}
        </div>
    );
}

// How long the local composer can sit idle before we tell the other side
// typing stopped — also doubles as the receiving-side safety-net timeout in
// case a "stop" event is ever missed (dropped connection mid-keystroke).
const TYPING_IDLE_MS = 2000;

export default function MessagesThread({
    caseId,
    initialMessages,
    token,
}: {
    caseId: string;
    initialMessages: MessageRow[];
    token: string;
}) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [connected, setConnected] = useState(false);
    const [socketError, setSocketError] = useState<string | null>(null);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [recording, setRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const iAmTypingRef = useRef(false);
    const myTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordStreamRef = useRef<MediaStream | null>(null);
    const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const socket = io(API_URL, { auth: { token }, transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("join", { caseId });
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("message:new", (msg: MessageRow) => {
            setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
        });
        // The backend emits this on a denied join or a rejected send (e.g.
        // access was revoked, or the case just closed) — there was no
        // listener for it at all before, so a message could silently vanish
        // with the composer already cleared and zero feedback.
        socket.on("error", (payload: { message?: string }) => {
            setSocketError(payload?.message || "Something went wrong with the connection.");
        });
        socket.on("typing", (payload: { userName: string; isTyping: boolean }) => {
            if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
            if (!payload.isTyping) {
                setTypingUser(null);
                return;
            }
            setTypingUser(payload.userName || "Someone");
            // Safety net in case a "stop" broadcast is ever missed (e.g. a
            // connection drop mid-keystroke) — the indicator can't get stuck.
            typingClearTimerRef.current = setTimeout(() => setTypingUser(null), TYPING_IDLE_MS * 2.5);
        });

        return () => {
            socket.close();
            if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
            if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
        };
    }, [caseId, token]);

    // Throttled: only actually emits "typing:start" on the transition into
    // typing, then resets a single idle timer that emits "typing:stop" once
    // the composer sits still — not on every keystroke.
    const notifyTyping = () => {
        const socket = socketRef.current;
        if (!socket?.connected) return;
        if (!iAmTypingRef.current) {
            iAmTypingRef.current = true;
            socket.emit("typing:start", { caseId });
        }
        if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
        myTypingTimerRef.current = setTimeout(() => {
            iAmTypingRef.current = false;
            socket.emit("typing:stop", { caseId });
        }, TYPING_IDLE_MS);
    };

    const stopTypingNow = () => {
        if (myTypingTimerRef.current) clearTimeout(myTypingTimerRef.current);
        if (iAmTypingRef.current) {
            iAmTypingRef.current = false;
            socketRef.current?.emit("typing:stop", { caseId });
        }
    };

    useEffect(() => {
        if (!socketError) return;
        const timer = setTimeout(() => setSocketError(null), 6000);
        return () => clearTimeout(timer);
    }, [socketError]);

    useEffect(() => {
        if (!uploadError) return;
        const timer = setTimeout(() => setUploadError(null), 6000);
        return () => clearTimeout(timer);
    }, [uploadError]);

    // Stops the mic stream's tracks and the recording timer — called both on
    // a normal stop/cancel and on unmount, so leaving the chat mid-recording
    // never leaves the browser's mic-in-use indicator on.
    const teardownRecording = () => {
        recordStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordStreamRef.current = null;
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
        setRecording(false);
        setRecordSeconds(0);
    };

    useEffect(() => teardownRecording, []);

    const pickFiles = () => fileInputRef.current?.click();

    const onFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = Array.from(e.target.files ?? []);
        if (chosen.length > 0) setPendingFiles((prev) => [...prev, ...chosen]);
        e.target.value = ""; // lets picking the exact same file again re-fire onChange
    };

    const removePendingFile = (index: number) => {
        setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const startRecording = async () => {
        setUploadError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordStreamRef.current = stream;
            recordedChunksRef.current = [];

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                const ext = recorder.mimeType?.includes("mp4") ? "m4a" : "webm";
                const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: blob.type });
                setPendingFiles((prev) => [...prev, file]);
                teardownRecording();
            };
            recorder.start();
            setRecording(true);
            setRecordSeconds(0);
            recordTimerRef.current = setInterval(() => {
                setRecordSeconds((s) => {
                    if (s + 1 >= MAX_RECORDING_SECONDS) {
                        mediaRecorderRef.current?.stop();
                    }
                    return s + 1;
                });
            }, 1000);
        } catch {
            setUploadError("Couldn't access the microphone. Check your browser's permission settings.");
        }
    };

    const stopRecording = () => mediaRecorderRef.current?.stop();

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            // Discard whatever was captured — onstop still fires, so clear
            // the chunks first and make onstop a no-op for this take.
            recordedChunksRef.current = [];
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        teardownRecording();
    };

    useEffect(() => {
        // block/inline "nearest" pins this to the chat panel's own
        // overflow-y-auto container — without it, scrollIntoView is free to
        // scroll ANY ancestor (including the whole page) to bring the
        // target into view, which is what was actually happening here: the
        // typing indicator toggling on/off rapidly was yanking the outer
        // page's scroll position around on every change, showing up as a
        // blank area opening and closing rather than a real layout bug.
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, [messages, typingUser]);

    // Attachments are always REST (multipart doesn't travel over the socket
    // transport) — the created message still reaches every participant,
    // including this tab, via the "message:new" socket broadcast the
    // backend fires after saving it, same as a text send. So this only
    // needs to POST and handle the upload's own success/failure; it doesn't
    // append to `messages` itself.
    const uploadPendingFiles = async () => {
        const files = pendingFiles;
        const content = draft.trim();
        setUploading(true);
        setDraft("");
        setPendingFiles([]);
        stopTypingNow();

        try {
            const formData = new FormData();
            if (content) formData.append("content", content);
            for (const file of files) formData.append("files", file);

            const res = await fetch(`/api/messages/attachments?case=${caseId}`, {
                method: "POST",
                body: formData,
            });
            const result = await res.json();
            if (!result.success) {
                setUploadError(result.message || "Couldn't send the attachment. Please try again.");
            }
        } catch {
            setUploadError("Couldn't send the attachment. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleSend = async () => {
        if (pendingFiles.length > 0) {
            await uploadPendingFiles();
            return;
        }

        const content = draft.trim();
        if (!content || sending) return;
        setSending(true);
        setDraft("");
        stopTypingNow();

        // Prefer the live socket (instant, and broadcasts to the room including
        // ourselves); fall back to the REST action if the socket isn't
        // connected yet so sending never silently does nothing.
        if (socketRef.current?.connected) {
            socketRef.current.emit("message:send", { caseId, content });
        } else {
            const result = await sendMessageAction(caseId, content);
            if (result.success) {
                setMessages((prev) => [...prev, result.data]);
            } else {
                setSocketError(result.message || "Couldn't send your message. Please try again.");
            }
        }
        setSending(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[560px]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">Case conversation</p>
                <span
                    className={`inline-flex items-center gap-1.5 text-xs ${connected ? "text-emerald-600" : "text-slate-400"}`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {connected ? "Live" : "Connecting…"}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                        No messages yet. Send the first one below.
                    </p>
                ) : (
                    messages.map((m) => {
                        const senderId = typeof m.sender === "string" ? m.sender : m.sender._id;
                        const isMine = senderId === user?._id;
                        const senderName = typeof m.sender === "string" ? "" : `${m.sender.firstName} ${m.sender.lastName}`;
                        return (
                            <div key={m._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                        isMine ? "bg-brand-gold text-white" : "bg-slate-100 text-slate-800"
                                    }`}
                                >
                                    {!isMine && <p className="text-xs font-medium mb-0.5 text-slate-500">{senderName}</p>}
                                    {m.attachments && m.attachments.length > 0 && (
                                        <div className="space-y-1.5 mb-1.5">
                                            {m.attachments.map((att) => (
                                                <AttachmentBubbleContent
                                                    key={att._id}
                                                    attachment={att}
                                                    url={attachmentUrl(m._id, att._id)}
                                                    isMine={isMine}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                                    <p className={`text-[10px] mt-1 ${isMine ? "text-white/70" : "text-slate-400"}`}>
                                        {formatTime(m.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                {typingUser && (
                    <div className="flex justify-start">
                        <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-slate-100" aria-live="polite">
                            <span className="sr-only">{typingUser} is typing</span>
                            <TypingDots />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {socketError && (
                <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
                    {socketError}
                </div>
            )}
            {uploadError && (
                <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600" role="alert">
                    {uploadError}
                </div>
            )}

            {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3">
                    {pendingFiles.map((file, i) => (
                        <div
                            key={`${file.name}-${i}`}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-1.5 py-1.5 text-xs text-slate-700"
                        >
                            {file.type.startsWith("image/") ? (
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="max-w-[140px] truncate">{file.name}</span>
                            <span className="text-slate-400">{formatBytes(file.size)}</span>
                            <button
                                onClick={() => removePendingFile(i)}
                                className="rounded-full p-0.5 hover:bg-slate-200 transition"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACHMENT_ACCEPT}
                onChange={onFilesChosen}
                className="hidden"
            />

            {recording ? (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <span className="flex-1 text-sm text-slate-600">Recording… {formatDuration(recordSeconds)}</span>
                    <button
                        onClick={cancelRecording}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={stopRecording}
                        className="rounded-lg bg-brand-gold p-2.5 text-white hover:bg-[#a3853a] active:scale-[0.98] transition"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
                    <button
                        onClick={pickFiles}
                        disabled={uploading}
                        title="Attach photo or document"
                        className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                        onClick={startRecording}
                        disabled={uploading}
                        title="Record a voice note"
                        className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                        <Mic className="w-4 h-4" />
                    </button>
                    <input
                        value={draft}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            if (e.target.value.trim()) notifyTyping();
                            else stopTypingNow();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={pendingFiles.length > 0 ? "Add a caption…" : "Type a message…"}
                        className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                    />
                    <button
                        onClick={handleSend}
                        disabled={(!draft.trim() && pendingFiles.length === 0) || sending || uploading}
                        className="rounded-lg bg-brand-gold p-2.5 text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-50"
                    >
                        {uploading ? (
                            <span className="block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
