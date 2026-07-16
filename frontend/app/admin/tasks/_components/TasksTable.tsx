"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import ConfirmModal from "../../_components/ConfirmModal";
import StatusBadge from "../../_components/StatusBadge";
import { deleteTaskAction } from "@/lib/actions/task";
import { statusTone, statusLabel, priorityTone, priorityLabel } from "./constants";

export interface TaskRow {
    _id: string;
    title: string;
    priority: string;
    status: string;
    dueDate?: string;
    assignee?: { _id: string; firstName: string; lastName: string } | null;
    case?: { _id: string; title: string; caseNumber: string } | null;
}

export default function TasksTable({
    tasks,
    onEdit,
    onChanged,
}: {
    tasks: TaskRow[];
    onEdit: (task: TaskRow) => void;
    onChanged: () => void;
}) {
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Task
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                                    Priority
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                    Assignee
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                                    Due
                                </th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                    Status
                                </th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tasks.map((t) => (
                                <tr key={t._id} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium text-slate-900">{t.title}</p>
                                        {t.case && (
                                            <p className="text-xs text-slate-400 mt-0.5 font-mono">{t.case.caseNumber}</p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 hidden sm:table-cell">
                                        <StatusBadge tone={priorityTone[t.priority] ?? "neutral"} label={priorityLabel[t.priority] ?? t.priority} />
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                                        {t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : (
                                            <span className="text-slate-300">Unassigned</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge tone={statusTone[t.status] ?? "neutral"} label={statusLabel[t.status] ?? t.status} />
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => onEdit(t)}
                                                title="Edit"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget({ id: t._id, title: t.title })}
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
                    title="Delete task"
                    message={
                        <>
                            Are you sure you want to delete <span className="font-medium text-slate-900">{deleteTarget.title}</span>? This
                            action cannot be undone.
                        </>
                    }
                    confirmLabel="Delete"
                    pendingLabel="Deleting..."
                    action={() => deleteTaskAction(deleteTarget.id)}
                    onClose={() => setDeleteTarget(null)}
                    onSuccess={() => {
                        setDeleteTarget(null);
                        onChanged();
                    }}
                />
            )}
        </>
    );
}
