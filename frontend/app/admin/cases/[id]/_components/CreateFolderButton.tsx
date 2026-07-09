"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { createFolderAction } from "@/lib/actions/document";

export default function CreateFolderButton({
    caseId,
    parentId,
}: {
    caseId: string;
    parentId?: string;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleCreate = () => {
        if (!name.trim()) {
            setError("Folder name is required");
            return;
        }
        setError("");
        startTransition(async () => {
            const result = await createFolderAction(caseId, name.trim(), parentId);
            if (result.success) {
                setOpen(false);
                setName("");
                router.refresh();
            } else {
                setError(result.message || "Failed to create folder");
            }
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
                <FolderPlus className="w-4 h-4" />
                New Folder
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                        <h2 className="text-sm font-semibold text-slate-900 mb-3">New folder</h2>
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            placeholder="Folder name"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                        />
                        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleCreate}
                                disabled={isPending}
                                className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                            >
                                {isPending ? "Creating..." : "Create"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    setError("");
                                    setName("");
                                }}
                                disabled={isPending}
                                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
