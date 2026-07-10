"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X, Eye } from "lucide-react";
import ApproveRequestModal from "./ApproveRequestModal";
import RejectRequestModal from "./RejectRequestModal";
import { requestStatusStyles, typeLabel } from "./constants";

export interface AttorneyOption {
    _id: string;
    firstName: string;
    lastName: string;
    userType: string;
}

export interface CaseRequestRow {
    _id: string;
    title: string;
    type: string;
    description: string;
    phone: string;
    status: "pending" | "approved" | "rejected";
    reviewNote?: string;
    requestedBy?: { firstName: string; lastName: string; email: string } | null;
    resultingCase?: { _id: string; caseNumber: string; title: string } | null;
    createdAt: string;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function CaseRequestsTable({
    requests,
    attorneys,
}: {
    requests: CaseRequestRow[];
    attorneys: AttorneyOption[];
}) {
    const router = useRouter();
    const [approveTarget, setApproveTarget] = useState<{ id: string; title: string } | null>(null);
    const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Requested by
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Matter
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                                    Type
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                    Submitted
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Status
                                </th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {requests.map((r) => (
                                <tr key={r._id} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium text-slate-900">
                                            {r.requestedBy
                                                ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}`
                                                : "Unknown"}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">{r.requestedBy?.email}</p>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <p className="text-slate-700 max-w-xs truncate" title={r.description}>
                                            {r.title}
                                        </p>
                                        {r.status === "rejected" && r.reviewNote && (
                                            <p className="text-xs text-red-500 mt-0.5 max-w-xs truncate" title={r.reviewNote}>
                                                {r.reviewNote}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 capitalize hidden sm:table-cell">
                                        {typeLabel[r.type] ?? r.type}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                                        {formatDate(r.createdAt)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-full text-xs capitalize ${
                                                requestStatusStyles[r.status] ?? "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {r.status === "pending" ? (
                                                <>
                                                    <button
                                                        onClick={() => setApproveTarget({ id: r._id, title: r.title })}
                                                        title="Approve"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectTarget({ id: r._id, title: r.title })}
                                                        title="Reject"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : r.status === "approved" && r.resultingCase ? (
                                                <Link
                                                    href={`/admin/cases/${r.resultingCase._id}`}
                                                    title="View case"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {approveTarget && (
                <ApproveRequestModal
                    requestId={approveTarget.id}
                    title={approveTarget.title}
                    attorneys={attorneys}
                    onClose={() => setApproveTarget(null)}
                    onSuccess={() => {
                        setApproveTarget(null);
                        router.refresh();
                    }}
                />
            )}

            {rejectTarget && (
                <RejectRequestModal
                    requestId={rejectTarget.id}
                    title={rejectTarget.title}
                    onClose={() => setRejectTarget(null)}
                    onSuccess={() => {
                        setRejectTarget(null);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
