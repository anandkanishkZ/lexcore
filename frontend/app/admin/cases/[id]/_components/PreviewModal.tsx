"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Download, ExternalLink, Sparkles, Send } from "lucide-react";
import { downloadUrl, isImage, fileMeta } from "@/lib/fileMeta";
import { chatAboutDocumentAction } from "@/lib/actions/ai";
import type { FileRow } from "./documentTypes";

type ChatTurn = { role: "user" | "assistant"; content: string };

const STARTER_PROMPT = "Summarize this document";

export default function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
    const src = downloadUrl(file._id);
    const image = isImage(file.mimeType);
    const isPdf = file.mimeType === "application/pdf";
    const { Icon, color } = fileMeta(file.mimeType);

    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState<ChatTurn[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [chatError, setChatError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isPending]);

    const handleSend = (question?: string) => {
        const content = (question ?? chatInput).trim();
        if (!content || isPending) return;

        const history = messages;
        setChatInput("");
        setChatError(null);
        setMessages([...history, { role: "user", content }]);

        startTransition(async () => {
            const result = await chatAboutDocumentAction(file._id, content, history);
            if (!result.success) {
                setChatError(result.message || "Couldn't get an answer.");
                return;
            }
            setMessages((prev) => [...prev, { role: "assistant", content: result.data.answer }]);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className={`w-full ${chatOpen ? "max-w-6xl" : "max-w-4xl"} h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden transition-[max-width]`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${color}`} strokeWidth={1.75} />
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => setChatOpen((v) => !v)}
                            title="Ask AI about this document"
                            className={`p-1.5 rounded-lg transition ${
                                chatOpen ? "text-brand-gold bg-slate-100" : "text-slate-400 hover:text-brand-gold hover:bg-slate-100"
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                        <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href={src}
                            download={file.name}
                            title="Download"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                        <button
                            onClick={onClose}
                            title="Close"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto">
                        {image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- same-origin route-handler URL, not an optimizable static asset
                            <img src={src} alt={file.name} className="max-w-full max-h-full object-contain" />
                        ) : isPdf ? (
                            <iframe src={src} title={file.name} className="w-full h-full border-0" />
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-center px-6">
                                <Icon className={`w-12 h-12 ${color}`} strokeWidth={1.25} />
                                <p className="text-sm text-slate-500">
                                    No inline preview for this file type.{" "}
                                    <a href={src} download={file.name} className="text-brand-gold hover:underline">
                                        Download
                                    </a>{" "}
                                    to view it.
                                </p>
                            </div>
                        )}
                    </div>

                    {chatOpen && (
                        <div className="w-96 shrink-0 border-l border-slate-100 flex flex-col bg-white">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Ask AI</p>
                                <p className="text-xs text-slate-400 mt-0.5">Answers are grounded in this document only.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="pt-4">
                                        <p className="text-sm text-slate-400 mb-3">
                                            Ask anything about &quot;{file.name}&quot;.
                                        </p>
                                        <button
                                            onClick={() => handleSend(STARTER_PROMPT)}
                                            className="text-xs rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-brand-gold hover:text-brand-gold transition"
                                        >
                                            {STARTER_PROMPT}
                                        </button>
                                    </div>
                                ) : (
                                    messages.map((m, i) => (
                                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                                                    m.role === "user" ? "bg-brand-gold text-white" : "bg-slate-100 text-slate-800"
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isPending && (
                                    <div className="flex justify-start">
                                        <div className="rounded-2xl px-3.5 py-2 text-sm bg-slate-100 text-slate-400">Thinking…</div>
                                    </div>
                                )}
                                {chatError && (
                                    <p
                                        className={`text-xs rounded-lg px-3 py-2 ${
                                            /not configured/i.test(chatError)
                                                ? "bg-amber-50 border border-amber-200 text-amber-700"
                                                : "bg-red-50 border border-red-200 text-red-600"
                                        }`}
                                    >
                                        {chatError}
                                    </p>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-100">
                                <input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Ask a question…"
                                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!chatInput.trim() || isPending}
                                    className="rounded-lg bg-brand-gold p-2 text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
