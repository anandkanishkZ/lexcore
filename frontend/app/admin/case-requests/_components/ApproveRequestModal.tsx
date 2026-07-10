"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { approveCaseRequestAction } from "@/lib/actions/case-request";

interface AttorneyOption {
    _id: string;
    firstName: string;
    lastName: string;
    userType: string;
}

interface ApproveRequestModalProps {
    requestId: string;
    title: string;
    attorneys: AttorneyOption[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ApproveRequestModal({
    requestId,
    title,
    attorneys,
    onClose,
    onSuccess,
}: ApproveRequestModalProps) {
    const [isPending, startTransition] = useTransition();
    const [assignedAttorney, setAssignedAttorney] = useState("");
    const [error, setError] = useState("");

    const handleApprove = () => {
        setError("");
        startTransition(async () => {
            const result = await approveCaseRequestAction(requestId, {
                assignedAttorney: assignedAttorney || undefined,
            });
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Failed to approve request");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Approve request</h2>
                </div>

                <p className="text-sm text-slate-600">
                    Approving <span className="font-medium text-slate-900">{title}</span> creates a real case and
                    links (or creates) a client record from the requester&apos;s details.
                </p>

                <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Assign attorney <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <select
                        value={assignedAttorney}
                        onChange={(e) => setAssignedAttorney(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                    >
                        <option value="">— Unassigned —</option>
                        {attorneys.map((a) => (
                            <option key={a._id} value={a._id}>
                                {a.firstName} {a.lastName} — {a.userType}
                            </option>
                        ))}
                    </select>
                </div>

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleApprove}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Approving..." : "Approve"}
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
