"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameDocumentAction, renameFolderAction } from "@/lib/actions/document";

export default function RenameModal({
    caseId,
    target,
    onClose,
}: {
    caseId: string;
    target: { type: "file" | "folder"; id: string; name: string };
    onClose: () => void;
}) {
    const router = useRouter();
    const [name, setName] = useState(target.name);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleRename = () => {
        if (!name.trim()) {
            setError("Name is required");
            return;
        }
        setError("");
        startTransition(async () => {
            const action = target.type === "file" ? renameDocumentAction : renameFolderAction;
            const result = await action(caseId, target.id, name.trim());
            if (result.success) {
                onClose();
                router.refresh();
            } else {
                setError(result.message || "Failed to rename");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                    Rename {target.type === "file" ? "file" : "folder"}
                </h2>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                    onFocus={(e) => e.target.select()}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleRename}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
