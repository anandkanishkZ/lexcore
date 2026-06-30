"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ShieldCheck, Users as UsersIcon, Eye, Pencil } from "lucide-react";

export interface Member {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    category: "staff" | "client";
    subtype: string;
    status?: string;
    createdAt: string;
    detailHref?: string;
}

const PAGE_SIZE = 10;

export default function UsersTable({ members }: { members: Member[] }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return members;
        return members.filter((m) =>
            `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q)
        );
    }, [members, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    return (
        <div>
            <div className="mb-4 relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by name or email..."
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                {pageItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                            <UsersIcon className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                        </div>
                        <p className="text-sm font-medium text-slate-700">No one found</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Try adjusting your search.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Name</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Email</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Phone</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Category</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                                <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                                <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map((m) => (
                                <tr
                                    key={`${m.category}-${m.id}`}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-medium text-slate-600">
                                                    {m.firstName[0]}
                                                    {m.lastName[0]}
                                                </span>
                                            </div>
                                            <p className="font-medium text-slate-900 truncate">
                                                {m.firstName} {m.lastName}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">{m.email}</td>
                                    <td className="py-3 px-4 text-slate-600">{m.phone || "—"}</td>
                                    <td className="py-3 px-4">
                                        {m.category === "staff" ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700">
                                                <ShieldCheck className="w-3 h-3" />
                                                Staff
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-sky-50 text-sky-700">
                                                <UsersIcon className="w-3 h-3" />
                                                Client
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 capitalize">
                                            {m.subtype}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {m.status ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full capitalize ${
                                                    m.status === "active"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-red-50 text-red-600"
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        m.status === "active" ? "bg-emerald-500" : "bg-red-500"
                                                    }`}
                                                />
                                                {m.status}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {m.detailHref ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={m.detailHref}
                                                    title="View"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`${m.detailHref}/edit`}
                                                    title="Edit"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        ) : (
                                            <p className="text-right text-xs text-slate-400">—</p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-slate-500">
                        Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                        {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                        {currentPage > 1 && (
                            <button
                                onClick={() => setPage(currentPage - 1)}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                                Previous
                            </button>
                        )}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                                    p === currentPage
                                        ? "bg-brand-gold text-white"
                                        : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                        {currentPage < totalPages && (
                            <button
                                onClick={() => setPage(currentPage + 1)}
                                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                                Next
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
