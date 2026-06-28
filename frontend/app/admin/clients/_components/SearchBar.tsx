"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SearchBarProps {
    defaultValue?: string;
    size: number;
}

export default function SearchBar({ defaultValue = "", size }: SearchBarProps) {
    const [search, setSearch] = useState(defaultValue);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let url = `/admin/clients?page=1&size=${size}`;
        if (search.trim()) {
            url += `&search=${encodeURIComponent(search.trim())}`;
        }
        router.push(url);
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-64 rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
            />
            <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2540] transition"
            >
                Search
            </button>
        </form>
    );
}
