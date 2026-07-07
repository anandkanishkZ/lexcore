import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchCasesAction } from "@/lib/actions/case";

interface PageProps {
    searchParams: Promise<{ page?: string; size?: string; search?: string; status?: string }>;
}

const statusStyles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    closed: "bg-slate-100 text-slate-500",
    "on hold": "bg-blue-50 text-blue-600",
};

const typeLabel: Record<string, string> = {
    criminal: "Criminal",
    civil: "Civil",
    corporate: "Corporate",
    family: "Family",
    immigration: "Immigration",
    "real estate": "Real Estate",
    other: "Other",
};

export default async function CasesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const size = parseInt(params.size || "10");
    const search = params.search || undefined;
    const status = params.status || undefined;

    const result = await fetchCasesAction(page, size, search, status);

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    const cases: any[] = result.data || [];
    const total: number = result.meta?.total ?? 0;
    const totalPages = Math.ceil(total / size);

    function buildUrl(p: number, q?: string, st?: string) {
        const sp = new URLSearchParams({ page: String(p), size: String(size) });
        if (q) sp.set("search", q);
        if (st) sp.set("status", st);
        return `/admin/cases?${sp}`;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500">
                    All cases managed in Lexcore
                    {total > 0 && (
                        <span className="text-slate-400"> &middot; {total} total</span>
                    )}
                </p>
                <Link
                    href="/admin/cases/create"
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <Plus className="w-4 h-4" />
                    New Case
                </Link>
            </div>

            {/* Search + Status filter */}
            <form className="mb-4 flex gap-3 flex-wrap" action="/admin/cases" method="GET">
                <input type="hidden" name="size" value={size} />
                <input
                    name="search"
                    defaultValue={search}
                    placeholder="Search by title, case number…"
                    className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                <select
                    name="status"
                    defaultValue={status ?? ""}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                >
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="on hold">On Hold</option>
                    <option value="closed">Closed</option>
                </select>
            </form>

            {!result.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load cases</p>
                    <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
                </div>
            ) : cases.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-medium text-slate-700">No cases found</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {search || status
                            ? "Try adjusting your filters."
                            : "Create your first case to get started."}
                    </p>
                </div>
            ) : (
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
                                {cases.map((c: any) => (
                                    <tr key={c._id} className="hover:bg-slate-50 transition">
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-slate-900">{c.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 font-mono">{c.caseNumber}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 capitalize hidden sm:table-cell">
                                            {typeLabel[c.type] ?? c.type}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                                            {c.client
                                                ? `${c.client.firstName} ${c.client.lastName}`
                                                : "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                                            {c.assignedAttorney
                                                ? `${c.assignedAttorney.firstName} ${c.assignedAttorney.lastName}`
                                                : <span className="text-slate-300">Unassigned</span>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded-full text-xs capitalize ${
                                                    statusStyles[c.status] ?? "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/cases/${c._id}`}
                                                    className="text-xs font-medium text-brand-gold hover:underline"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/admin/cases/${c._id}/edit`}
                                                    className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
                                                >
                                                    Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                            <p className="text-xs text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-1">
                                {page > 1 && (
                                    <Link
                                        href={buildUrl(page - 1, search, status)}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        href={buildUrl(page + 1, search, status)}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
