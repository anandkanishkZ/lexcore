import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchClientsAction } from "@/lib/actions/client";
import StatusBadge, { type StatusTone } from "../_components/StatusBadge";

interface PageProps {
    searchParams: Promise<{ page?: string; size?: string; search?: string }>;
}

const statusTone: Record<string, StatusTone> = {
    active: "success",
    inactive: "danger",
};

export default async function ClientsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const size = parseInt(params.size || "10");
    const search = params.search || undefined;

    const result = await fetchClientsAction(page, size, search);

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    const clients: any[] = result.data || [];
    const total: number = result.meta?.total ?? 0;
    const totalPages = Math.ceil(total / size);

    function buildUrl(p: number, q?: string) {
        const sp = new URLSearchParams({ page: String(p), size: String(size) });
        if (q) sp.set("search", q);
        return `/admin/clients?${sp}`;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500">
                    All clients registered in Lexcore
                    {total > 0 && (
                        <span className="text-slate-400"> &middot; {total} total</span>
                    )}
                </p>
                <Link
                    href="/admin/clients/create"
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Client
                </Link>
            </div>

            {/* Search */}
            <form className="mb-4" action="/admin/clients" method="GET">
                <input type="hidden" name="size" value={size} />
                <input
                    name="search"
                    defaultValue={search}
                    placeholder="Search by name, email or company…"
                    className="w-full max-w-sm rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
            </form>

            {!result.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load clients</p>
                    <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
                </div>
            ) : clients.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-medium text-slate-700">No clients found</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {search ? "Try a different search term." : "Add your first client to get started."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        Name
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        Email
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                                        Phone
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                        Type
                                    </th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                        Status
                                    </th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {clients.map((client: any) => (
                                    <tr key={client._id} className="hover:bg-slate-50 transition">
                                        <td className="px-5 py-3.5 font-medium text-slate-900">
                                            {client.firstName} {client.lastName}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500">{client.email}</td>
                                        <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                                            {client.phone}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 capitalize hidden md:table-cell">
                                            {client.type}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge tone={statusTone[client.status] ?? "neutral"} label={client.status} className="capitalize" />
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/clients/${client._id}`}
                                                    className="text-xs font-medium text-brand-gold hover:underline"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    href={`/admin/clients/${client._id}/edit`}
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                            <p className="text-xs text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-1">
                                {page > 1 && (
                                    <Link
                                        href={buildUrl(page - 1, search)}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        href={buildUrl(page + 1, search)}
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
