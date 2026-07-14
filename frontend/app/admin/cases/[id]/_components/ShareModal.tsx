"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Users, Trash2 } from "lucide-react";
import { shareDocumentAction, fetchSharesAction, revokeShareAction } from "@/lib/actions/document";

interface ShareRow {
    _id: string;
    email: string;
    role: "viewer" | "editor";
    sharedBy?: { firstName: string; lastName: string };
    createdAt: string;
}

export default function ShareModal({ file, onClose }: { file: { _id: string; name: string }; onClose: () => void }) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"viewer" | "editor">("viewer");
    const [shares, setShares] = useState<ShareRow[]>([]);
    const [loadingShares, setLoadingShares] = useState(true);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const loadShares = () => {
        fetchSharesAction(file._id).then((result) => {
            if (result.success) setShares(result.data);
            setLoadingShares(false);
        });
    };

    useEffect(() => {
        loadShares();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file._id]);

    const handleShare = () => {
        if (!email.trim()) {
            setError("Email is required");
            return;
        }
        setError("");
        startTransition(async () => {
            const result = await shareDocumentAction(file._id, email.trim(), role);
            if (result.success) {
                setEmail("");
                loadShares();
            } else {
                setError(result.message || "Failed to share file");
            }
        });
    };

    const handleRevoke = (shareId: string) => {
        startTransition(async () => {
            const result = await revokeShareAction(file._id, shareId);
            if (result.success) loadShares();
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold text-slate-900">Share &quot;{file.name}&quot;</h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">Grant access to this file by email — viewers can view/download, editors can also upload new versions.</p>

                <div className="flex gap-2">
                    <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleShare()}
                        placeholder="person@example.com"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                    >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                    </select>
                    <button
                        onClick={handleShare}
                        disabled={isPending}
                        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                    >
                        Share
                    </button>
                </div>
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

                <div className="mt-5">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Shared with</p>
                    {loadingShares ? (
                        <p className="text-xs text-slate-400 py-3">Loading…</p>
                    ) : shares.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                            <Users className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
                            <p className="text-xs text-slate-400">Not shared with anyone yet.</p>
                        </div>
                    ) : (
                        <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 -mx-1">
                            {shares.map((s) => (
                                <li key={s._id} className="flex items-center justify-between px-1 py-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{s.email}</p>
                                        <p className="text-xs text-slate-400 capitalize">{s.role}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRevoke(s._id)}
                                        disabled={isPending}
                                        title="Revoke access"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
