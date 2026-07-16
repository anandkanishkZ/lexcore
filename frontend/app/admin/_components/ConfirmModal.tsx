"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    /** "Working…" — shown on the confirm button while [action] is pending. */
    pendingLabel?: string;
    /** true (default) for a destructive action (red) — false for a
     * cautionary-but-not-destructive one (amber), e.g. voiding an invoice. */
    danger?: boolean;
    action: () => Promise<{ success: boolean; message?: string }>;
    onClose: () => void;
    onSuccess: () => void;
}

/** Shared confirm dialog for every destructive/cautionary action in the
 * console — replaces both native `window.confirm()`/`alert()` calls and the
 * several near-identical hand-rolled delete-confirmation modals (cases,
 * tasks, users, invoices) that existed before this, one styled pattern
 * instead of N copies that could each drift independently. */
export default function ConfirmModal({
    title,
    message,
    confirmLabel,
    pendingLabel = "Working...",
    danger = true,
    action,
    onClose,
    onSuccess,
}: ConfirmModalProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleConfirm = () => {
        setError("");
        startTransition(async () => {
            const result = await action();
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Something went wrong");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? "bg-red-50" : "bg-amber-50"}`}>
                        <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-600" : "text-amber-600"}`} />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                </div>

                <p className="text-sm text-slate-600">{message}</p>

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white active:scale-[0.98] transition disabled:opacity-60 ${
                            danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-gold hover:bg-[#a3853a]"
                        }`}
                    >
                        {isPending ? pendingLabel : confirmLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
