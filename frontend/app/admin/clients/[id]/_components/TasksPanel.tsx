import { ListTodo, AlertCircle } from "lucide-react";
import { fetchTasksAction } from "@/lib/actions/task";
import StatusBadge from "../../../_components/StatusBadge";
import { statusTone, statusLabel, priorityTone, priorityLabel } from "../../../tasks/_components/constants";

export default async function TasksPanel({ clientId }: { clientId: string }) {
    const result = await fetchTasksAction(undefined, undefined, undefined, clientId);

    if (!result.success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load tasks</p>
                <p className="text-xs text-slate-500 mt-1">{result.message}</p>
            </div>
        );
    }

    const tasks: any[] = result.data ?? [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                {tasks.length} task{tasks.length === 1 ? "" : "s"} across all cases
            </p>

            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                        <ListTodo className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No tasks yet</p>
                    <p className="text-xs text-slate-500 mt-1">Tasks on this client&apos;s cases will show up here.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {tasks.map((t) => (
                        <div key={t._id} className="flex items-center justify-between py-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {t.case?.title ?? "No case"}
                                    {t.assignee && (
                                        <>
                                            {" "}
                                            &middot; {t.assignee.firstName} {t.assignee.lastName}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge tone={priorityTone[t.priority] ?? "neutral"} label={priorityLabel[t.priority] ?? t.priority} />
                                <StatusBadge tone={statusTone[t.status] ?? "neutral"} label={statusLabel[t.status] ?? t.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
