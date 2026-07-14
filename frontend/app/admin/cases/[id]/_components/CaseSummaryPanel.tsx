"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { summarizeCaseAction } from "@/lib/actions/ai";

export default function CaseSummaryPanel({ caseId }: { caseId: string }) {
    const [isPending, startTransition] = useTransition();
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notConfigured, setNotConfigured] = useState(false);

    const handleClick = () => {
        setError(null);
        setNotConfigured(false);
        startTransition(async () => {
            const result = await summarizeCaseAction(caseId);
            if (!result.success) {
                if (/not configured/i.test(result.message || "")) {
                    setNotConfigured(true);
                } else {
                    setError(result.message || "Something went wrong. Please try again.");
                }
                return;
            }
            setSummary(result.data.summary);
        });
    };

    return (
        <div className="border-t border-slate-100 pt-4">
            <button
                onClick={handleClick}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-gold hover:text-brand-gold transition disabled:opacity-60"
            >
                <Sparkles className="w-3.5 h-3.5" />
                {isPending ? "Summarizing…" : summary ? "Regenerate summary" : "Summarize with AI"}
            </button>

            {notConfigured && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    AI features aren&apos;t configured yet — contact your administrator.
                </p>
            )}
            {error && !notConfigured && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {summary && !isPending && (
                <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg px-3.5 py-3">
                    {summary}
                </p>
            )}
        </div>
    );
}
