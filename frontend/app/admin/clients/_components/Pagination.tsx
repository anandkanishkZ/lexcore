"use client";

import Link from "next/link";

interface PaginationProps {
    page: number;
    size: number;
    total: number;
    search?: string;
}

function buildUrl(page: number, size: number, search?: string) {
    let url = `/admin/clients?page=${page}&size=${size}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }
    return url;
}

export default function Pagination({
    page,
    size,
    total,
    search,
}: PaginationProps) {
    const totalPages = Math.ceil(total / size);

    if (totalPages <= 1) return null;

    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500">
                Showing {(page - 1) * size + 1} to{" "}
                {Math.min(page * size, total)} of {total} clients
            </p>
            <div className="flex items-center gap-1">
                {page > 1 && (
                    <Link
                        href={buildUrl(page - 1, size, search)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                    >
                        Previous
                    </Link>
                )}
                {pages.map((p) => (
                    <Link
                        key={p}
                        href={buildUrl(p, size, search)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                            p === page
                                ? "bg-brand text-white"
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
        </div>
    );
}
