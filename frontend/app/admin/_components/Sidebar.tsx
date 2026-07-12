"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";
import { navSections } from "./navConfig";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    return (
        <aside className="w-64 shrink-0 bg-brand flex flex-col">
            <div className="h-16 flex items-center px-5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center shrink-0">
                        <Scale className="w-4.5 h-4.5 text-brand" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white text-sm font-semibold tracking-tight leading-none">
                            Lexcore
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">Admin Panel</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
                {navSections.map((section) => (
                    <div key={section.label}>
                        <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {section.label}
                        </p>
                        <div className="space-y-0.5">
                            {section.items
                                .filter((item) => !item.adminOnly || isAdmin)
                                .map((item) => {
                                const isActive =
                                    item.href === "/admin"
                                        ? pathname === "/admin"
                                        : pathname.startsWith(item.href) ||
                                          (item.matchPrefixes?.some((p) =>
                                              pathname.startsWith(p)
                                          ) ??
                                              false);
                                const Icon = item.icon;

                                if (item.soon) {
                                    return (
                                        <div
                                            key={item.label}
                                            title="Coming soon"
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                        >
                                            <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                                            <span className="flex-1 truncate">{item.label}</span>
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                                                Soon
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition border-l-2 ${
                                            isActive
                                                ? "text-white bg-white/10 border-brand-gold"
                                                : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
                                        }`}
                                    >
                                        <Icon
                                            className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-gold" : ""}`}
                                            strokeWidth={isActive ? 2.25 : 1.75}
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-3 border-t border-white/10">
                <p className="px-3 py-2 text-[11px] text-slate-500">
                    Lexcore &middot; Single Branch Edition
                </p>
            </div>
        </aside>
    );
}
