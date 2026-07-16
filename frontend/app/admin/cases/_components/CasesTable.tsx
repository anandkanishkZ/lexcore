"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import ConfirmModal from "../../_components/ConfirmModal";
import StatusBadge from "../../_components/StatusBadge";
import { deleteCaseAction } from "@/lib/actions/case";
import { statusTone, statusLabel, typeLabel } from "./constants";

export interface CaseRow {
    _id: string;
    title: string;
    caseNumber: string;
    type: string;
    status: string;
    client?: { firstName: string; lastName: string } | null;
    assignedAttorney?: { firstName: string; lastName: string } | null;
}

export default function CasesTable({ cases }: { cases: CaseRow[] }) {
    const router = useRouter();
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Case
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                                    Type
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                    Client
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                                    Attorney
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Status
                                </th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {cases.map((c) => (
                                <tr key={c._id} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium text-slate-900">{c.title}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.caseNumber}</p>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 capitalize hidden sm:table-cell">
                                        {typeLabel[c.type] ?? c.type}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                                        {c.client ? `${c.client.firstName} ${c.client.lastName}` : "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                                        {c.assignedAttorney ? (
                                            `${c.assignedAttorney.firstName} ${c.assignedAttorney.lastName}`
                                        ) : (
                                            <span className="text-slate-300">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge tone={statusTone[c.status] ?? "neutral"} label={statusLabel[c.status] ?? c.status} />
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link
                                                href={`/admin/cases/${c._id}`}
                                                title="View"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link
                                                href={`/admin/cases/${c._id}/edit`}
                                                title="Edit"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => setDeleteTarget({ id: c._id, title: c.title })}
                                                title="Delete"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {deleteTarget && (
                <ConfirmModal
                    title="Delete case"
                    message={
                        <>
                            Are you sure you want to delete <span className="font-medium text-slate-900">{deleteTarget.title}</span>? This
                            action cannot be undone.
                        </>
                    }
                    confirmLabel="Delete"
                    pendingLabel="Deleting..."
                    action={() => deleteCaseAction(deleteTarget.id)}
                    onClose={() => setDeleteTarget(null)}
                    onSuccess={() => {
                        setDeleteTarget(null);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
