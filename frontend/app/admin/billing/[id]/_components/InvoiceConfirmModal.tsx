"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

interface InvoiceConfirmModalProps {
    title: string;
    message: React.ReactNode;
    confirmLabel: string;
    danger?: boolean;
    action: () => Promise<{ success: boolean; message?: string }>;
    onClose: () => void;
    onSuccess: () => void;
}

/** Shared confirm dialog for the invoice detail page's delete/void actions —
 * replaces a native window.confirm() with the same styled-modal pattern
 * every other destructive action in the app already uses (e.g. tasks'
 * DeleteTaskModal), for consistency. */
export default function InvoiceConfirmModal({
    title,
    message,
    confirmLabel,
    danger = true,
    action,
    onClose,
    onSuccess,
}: InvoiceConfirmModalProps) {
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
                        {isPending ? "Working..." : confirmLabel}
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
