import { redirect } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { fetchAuditLogsAction } from "@/lib/actions/audit-log";

interface PageProps {
    searchParams: Promise<{ page?: string }>;
}

const actionLabel: Record<string, string> = {
    "case.delete": "Deleted a case",
    "case-request.approve": "Approved a case request",
    "case-request.reject": "Rejected a case request",
    "user.delete": "Deleted a user",
    "user.role-change": "Changed a user's role",
    "client.delete": "Deleted a client",
};

export default async function AuditLogPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const size = 20;

    const result = await fetchAuditLogsAction(page, size);

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    const logs: any[] = result.data || [];
    const total: number = result.meta?.total ?? 0;
    const totalPages = Math.ceil(total / size);

    return (
        <div>
            <p className="text-sm text-slate-500 mb-6">
                A record of sensitive actions — case/client/user deletions, role changes, and case request decisions.
            </p>

            {!result.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load the audit log</p>
                    <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No activity recorded yet</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                            Actor
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                            Action
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                            Detail
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                            When
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50 transition">
                                            <td className="px-5 py-3.5 text-slate-700">
                                                {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-900 font-medium">
                                                {actionLabel[log.action] ?? log.action}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell max-w-xs truncate">
                                                {log.metadata ?? "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-1 py-3">
                            <p className="text-xs text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-1">
                                {page > 1 && (
                                    <Link
                                        href={`/admin/audit-log?page=${page - 1}`}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        href={`/admin/audit-log?page=${page + 1}`}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
