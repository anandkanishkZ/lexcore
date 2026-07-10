"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import { rejectCaseRequestAction } from "@/lib/actions/case-request";

interface RejectRequestModalProps {
    requestId: string;
    title: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RejectRequestModal({ requestId, title, onClose, onSuccess }: RejectRequestModalProps) {
    const [isPending, startTransition] = useTransition();
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    const handleReject = () => {
        if (!reason.trim()) {
            setError("Please give the client a reason.");
            return;
        }
        setError("");
        startTransition(async () => {
            const result = await rejectCaseRequestAction(requestId, reason.trim());
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Failed to reject request");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Reject request</h2>
                </div>

                <p className="text-sm text-slate-600">
                    Rejecting <span className="font-medium text-slate-900">{title}</span>. The client will see your
                    reason below.
                </p>

                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. This matter is outside our practice areas."
                    rows={3}
                    className="mt-3 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition resize-none"
                />

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleReject}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Rejecting..." : "Reject"}
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
