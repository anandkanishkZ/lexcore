"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";

const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Clients", href: "/admin/clients" },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";
    const displayName = user ? `${user.firstName} ${user.lastName}` : "User";

    return (
        <div className="flex h-full">
            <aside className="w-56 shrink-0 bg-brand flex flex-col">
                <div className="h-14 flex items-center px-5 border-b border-[#1a2540]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                            <span className="text-slate-900 text-xs font-bold">
                                L
                            </span>
                        </div>
                        <span className="text-white text-sm font-semibold tracking-tight">
                            Lexcore Admin
                        </span>
                    </div>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-center px-3 py-2 rounded-lg text-sm transition ${
                                    isActive
                                        ? "text-white bg-[#1a2540]"
                                        : "text-slate-400 hover:text-white hover:bg-[#1a2540]"
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-[#1a2540]">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="w-7 h-7 bg-[#1a2540] rounded-full flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-medium">
                                {initials}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                                {displayName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full mt-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#1a2540] rounded-lg transition text-left"
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
                    <span className="text-sm font-medium text-slate-900">
                        Admin Panel
                    </span>
                </header>
                <main className="flex-1 overflow-y-auto p-8">{children}</main>
            </div>
        </div>
    );
}
