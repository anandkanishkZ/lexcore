"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { fetchNotificationsAction, markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/notification";

interface NotificationItem {
    _id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

function timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        const result = await fetchNotificationsAction();
        if (result.success) {
            setNotifications(result.data.notifications ?? []);
            setUnread(result.data.unread ?? 0);
        }
    }, []);

    useEffect(() => {
        load();
        // Polling, not WebSocket — proportionate for a firm-internal bell, not
        // a chat app. 30s keeps the badge reasonably fresh without hammering the API.
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handleMarkRead = async (id: string) => {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
        setUnread((prev) => Math.max(0, prev - 1));
        await markNotificationReadAction(id);
    };

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
        await markAllNotificationsReadAction();
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition"
                title="Notifications"
            >
                <Bell className="w-4.5 h-4.5 text-slate-500" strokeWidth={1.75} />
                {unread > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-gold" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-20 max-h-96 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">Notifications</p>
                        {unread > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</p>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n._id}
                                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                                    className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${
                                        n.isRead ? "" : "bg-amber-50/40"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-gold shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900">{n.title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                                            <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
