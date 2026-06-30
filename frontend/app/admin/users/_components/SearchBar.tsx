"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
    defaultValue?: string;
    size: number;
}

export default function SearchBar({ defaultValue = "", size }: SearchBarProps) {
    const [search, setSearch] = useState(defaultValue);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let url = `/admin/users?page=1&size=${size}`;
        if (search.trim()) {
            url += `&search=${encodeURIComponent(search.trim())}`;
        }
        router.push(url);
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
            </div>
            <button
                type="submit"
                className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] transition"
            >
                Search
            </button>
        </form>
    );
}
