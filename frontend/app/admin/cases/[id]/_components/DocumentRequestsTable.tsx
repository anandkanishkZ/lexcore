"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X, FileCheck2, Clock, Ban } from "lucide-react";
import { cancelDocumentRequestAction } from "@/lib/actions/document-request";
import NewDocumentRequestModal from "./NewDocumentRequestModal";
import StatusBadge, { type StatusTone } from "../../../_components/StatusBadge";

export interface DocumentRequestRow {
    _id: string;
    title: string;
    description?: string;
    status: "pending" | "fulfilled" | "cancelled";
    requestedBy?: { firstName: string; lastName: string } | null;
    fulfilledFile?: { _id: string; name: string; mimeType: string; size: number } | null;
    createdAt: string;
}

const statusTone: Record<string, StatusTone> = {
    pending: "warning",
    fulfilled: "success",
    cancelled: "neutral",
};

const statusIcon: Record<string, typeof Clock> = {
    pending: Clock,
    fulfilled: FileCheck2,
    cancelled: Ban,
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DocumentRequestsTable({
    caseId,
    requests,
}: {
    caseId: string;
    requests: DocumentRequestRow[];
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showNewModal, setShowNewModal] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const handleCancel = (id: string) => {
        if (!confirm("Cancel this document request?")) return;
        setCancellingId(id);
        startTransition(async () => {
            await cancelDocumentRequestAction(id, caseId);
            setCancellingId(null);
            router.refresh();
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">
                    Ask the client to upload a specific document — they&apos;ll see this in the app.
                </p>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <Plus className="w-4 h-4" />
                    Request Document
                </button>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                        <FileCheck2 className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No document requests yet</p>
                    <p className="text-xs text-slate-500 mt-1">Request a document to get started.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        Requested
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                        By
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                                        Date
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        Status
                                    </th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {requests.map((r) => {
                                    const Icon = statusIcon[r.status] ?? Clock;
                                    return (
                                        <tr key={r._id} className="hover:bg-slate-50 transition">
                                            <td className="px-5 py-3.5">
                                                <p className="text-slate-900 font-medium max-w-xs truncate" title={r.description}>
                                                    {r.title}
                                                </p>
                                                {r.status === "fulfilled" && r.fulfilledFile && (
                                                    <Link
                                                        href={`/api/documents/${r.fulfilledFile._id}/download`}
                                                        target="_blank"
                                                        className="text-xs text-emerald-600 mt-0.5 truncate hover:underline inline-block"
                                                    >
                                                        {r.fulfilledFile.name}
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                                                {r.requestedBy ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}` : "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                                                {formatDate(r.createdAt)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <StatusBadge tone={statusTone[r.status] ?? "neutral"} label={r.status} icon={Icon} className="capitalize" />
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {r.status === "pending" && (
                                                    <button
                                                        onClick={() => handleCancel(r._id)}
                                                        disabled={isPending && cancellingId === r._id}
                                                        title="Cancel request"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showNewModal && (
                <NewDocumentRequestModal
                    caseId={caseId}
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => {
                        setShowNewModal(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
