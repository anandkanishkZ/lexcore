"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getPageTitle } from "./navConfig";
import NotificationBell from "./NotificationBell";

export default function Topbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";
    const displayName = user ? `${user.firstName} ${user.lastName}` : "User";

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
            <h1 className="text-base font-semibold text-slate-900">
                {getPageTitle(pathname)}
            </h1>

            <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition"
                >
                    <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-medium">{initials}</span>
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-medium text-slate-900 leading-none">
                            {displayName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 capitalize">
                            {user?.role || "Staff"}
                        </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-20">
                        <Link
                            href="/admin/profile"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                        >
                            <UserRound className="w-4 h-4 text-slate-400" />
                            Profile Settings
                        </Link>
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                )}
            </div>
            </div>
        </header>
    );
}
