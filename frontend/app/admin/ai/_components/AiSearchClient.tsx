"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, Sparkles, AlertCircle, FileText, Briefcase } from "lucide-react";
import { askAiAction } from "@/lib/actions/ai";

interface AiSource {
    type: "case" | "document";
    id: string;
    excerpt: string;
    title?: string;
    caseNumber?: string;
    name?: string;
    caseId?: string;
    caseTitle?: string;
}

export default function AiSearchClient() {
    const [query, setQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [answer, setAnswer] = useState<string | null>(null);
    const [sources, setSources] = useState<AiSource[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [notConfigured, setNotConfigured] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (!trimmed || isPending) return;

        setError(null);
        setNotConfigured(false);
        startTransition(async () => {
            const result = await askAiAction(trimmed);
            if (!result.success) {
                if (/not configured/i.test(result.message || "")) {
                    setNotConfigured(true);
                } else {
                    setError(result.message || "Something went wrong. Please try again.");
                }
                setAnswer(null);
                setSources([]);
                return;
            }
            setAnswer(result.data.answer);
            setSources(result.data.sources || []);
        });
    };

    return (
        <div className="space-y-5">
            <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Which cases mention a breach of lease?"
                    className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                <button
                    type="submit"
                    disabled={!query.trim() || isPending}
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    <Search className="w-4 h-4" />
                    {isPending ? "Thinking…" : "Ask"}
                </button>
            </form>

            {notConfigured && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    AI features aren&apos;t configured yet — contact your administrator.
                </div>
            )}

            {error && !notConfigured && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t get an answer</p>
                    <p className="text-xs text-slate-500 mt-1">{error}</p>
                </div>
            )}

            {answer !== null && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-brand-gold" />
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Answer</p>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{answer}</p>
                </div>
            )}

            {sources.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Sources</p>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {sources.map((s) => (
                            <Link
                                key={`${s.type}-${s.id}`}
                                href={s.type === "case" ? `/admin/cases/${s.id}` : `/admin/cases/${s.caseId}?tab=documents`}
                                className="flex items-start gap-3 p-4 hover:bg-slate-50 transition"
                            >
                                <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                                    {s.type === "case" ? (
                                        <Briefcase className="w-4 h-4 text-brand-gold" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-brand-gold" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {s.type === "case" ? s.title : s.name}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {s.type === "case" ? s.caseNumber : s.caseTitle}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{s.excerpt}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
