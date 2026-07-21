import Link from "next/link";
import { Briefcase, AlertCircle } from "lucide-react";
import { fetchCasesAction } from "@/lib/actions/case";
import StatusBadge from "../../../_components/StatusBadge";
import { statusTone, statusLabel, typeLabel } from "../../../cases/_components/constants";

export default async function AssignedCasesPanel({ userId }: { userId: string }) {
    const result = await fetchCasesAction(1, 100, undefined, undefined, undefined, userId);

    if (!result.success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load cases</p>
                <p className="text-xs text-slate-500 mt-1">{result.message}</p>
            </div>
        );
    }

    const cases: any[] = result.data ?? [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                {cases.length} case{cases.length === 1 ? "" : "s"} assigned
            </p>

            {cases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                        <Briefcase className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No cases assigned</p>
                    <p className="text-xs text-slate-500 mt-1">Cases assigned to this staff member will show up here.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {cases.map((c) => (
                        <Link
                            key={c._id}
                            href={`/admin/cases/${c._id}`}
                            className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.caseNumber}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-slate-500 capitalize">{typeLabel[c.type] ?? c.type}</span>
                                <StatusBadge tone={statusTone[c.status] ?? "neutral"} label={statusLabel[c.status] ?? c.status} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
