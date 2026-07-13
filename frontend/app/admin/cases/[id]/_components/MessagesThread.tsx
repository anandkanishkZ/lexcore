"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Send } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { sendMessageAction } from "@/lib/actions/message";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

interface MessageRow {
    _id: string;
    content: string;
    sender: { _id: string; firstName: string; lastName: string } | string;
    createdAt: string;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

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
    const socketRef = useRef<Socket | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

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

        return () => {
            socket.close();
        };
    }, [caseId, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        const content = draft.trim();
        if (!content || sending) return;
        setSending(true);
        setDraft("");

        // Prefer the live socket (instant, and broadcasts to the room including
        // ourselves); fall back to the REST action if the socket isn't
        // connected yet so sending never silently does nothing.
        if (socketRef.current?.connected) {
            socketRef.current.emit("message:send", { caseId, content });
        } else {
            const result = await sendMessageAction(caseId, content);
            if (result.success) {
                setMessages((prev) => [...prev, result.data]);
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
                                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                    <p className={`text-[10px] mt-1 ${isMine ? "text-white/70" : "text-slate-400"}`}>
                                        {formatTime(m.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                />
                <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="rounded-lg bg-brand-gold p-2.5 text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
