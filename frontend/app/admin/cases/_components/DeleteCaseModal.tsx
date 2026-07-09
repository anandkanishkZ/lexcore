"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteCaseAction } from "@/lib/actions/case";

interface DeleteCaseModalProps {
    caseId: string;
    title: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeleteCaseModal({ caseId, title, onClose, onSuccess }: DeleteCaseModalProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleDelete = () => {
        setError("");
        startTransition(async () => {
            const result = await deleteCaseAction(caseId);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Failed to delete case");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Delete case</h2>
                </div>

                <p className="text-sm text-slate-600">
                    Are you sure you want to delete <span className="font-medium text-slate-900">{title}</span>? This
                    action cannot be undone.
                </p>

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Deleting..." : "Delete"}
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
