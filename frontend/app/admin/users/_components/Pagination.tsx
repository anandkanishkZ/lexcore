"use client";

import Link from "next/link";

interface PaginationProps {
    page: number;
    size: number;
    total: number;
    search?: string;
}

function buildUrl(page: number, size: number, search?: string) {
    let url = `/admin/users?page=${page}&size=${size}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }
    return url;
}

export default function Pagination({ page, size, total, search }: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / size));

    return (
        <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500">
                {total === 0
                    ? "No results"
                    : `Showing ${(page - 1) * size + 1} to ${Math.min(page * size, total)} of ${total}`}
            </p>
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {page > 1 && (
                        <Link
                            href={buildUrl(page - 1, size, search)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        >
                            Previous
                        </Link>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Link
                            key={p}
                            href={buildUrl(p, size, search)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition ${
                                p === page
                                    ? "bg-brand-gold text-white"
                                    : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            {p}
                        </Link>
                    ))}
                    {page < totalPages && (
                        <Link
                            href={buildUrl(page + 1, size, search)}
                            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                        >
                            Next
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
