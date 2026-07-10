"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderPlus, Upload } from "lucide-react";
import { createFolderAction } from "@/lib/actions/document";
import { uploadDocument } from "@/lib/uploadDocument";

/** The consolidated "+ New" primary action (Drive's top-left button): opens a
 * dropdown for New folder / Upload files. Folder creation and the multi-file
 * upload flow both live here now, so the toolbar has one primary CTA instead of
 * two separate buttons. Upload reuses the shared lib/uploadDocument helper (the
 * same one the drag-and-drop zone uses). */
export default function NewMenu({ caseId, folderId }: { caseId: string; folderId?: string }) {
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!open) return;
        function onDoc(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Copy the File objects into an array BEFORE resetting the input.
        // `input.value = ""` empties the live FileList, so reading it afterwards
        // (or Array.from-ing the old reference) yields zero files — which is why
        // the picker opened but nothing uploaded.
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // allow re-selecting the same file(s) next time
        // Close the menu now — after the picker has already returned files, so
        // unmounting the label can't interrupt the native file-picker trigger.
        setOpen(false);
        if (files.length === 0) return;
        setError("");
        startTransition(async () => {
            const results = await Promise.all(files.map((f) => uploadDocument(caseId, folderId, f)));
            const failed = results.filter((r) => !r.success);
            if (failed.length > 0) setError(failed.map((r) => r.message).join("; ") || "Some files failed to upload");
            if (failed.length < files.length) router.refresh();
        });
    };

    const handleCreateFolder = () => {
        if (!folderName.trim()) {
            setError("Folder name is required");
            return;
        }
        setError("");
        startTransition(async () => {
            const result = await createFolderAction(caseId, folderName.trim(), folderId);
            if (result.success) {
                setFolderModalOpen(false);
                setFolderName("");
                router.refresh();
            } else {
                setError(result.message || "Failed to create folder");
            }
        });
    };

    return (
        <>
            <div ref={menuRef} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    disabled={isPending}
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    <Plus className="w-4 h-4" />
                    {isPending ? "Working…" : "New"}
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-30">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                setFolderModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 transition"
                        >
                            <FolderPlus className="w-3.5 h-3.5 text-brand-gold" />
                            New folder
                        </button>
                        {/* The file input lives INSIDE this label — clicking the
                            row activates it natively, with no htmlFor/id lookup and
                            no programmatic .click() that could be swallowed by a
                            re-render. The menu is closed later, in handleUpload. */}
                        <label className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            <Upload className="w-3.5 h-3.5 text-brand-gold" />
                            Upload files
                            <input
                                type="file"
                                onChange={handleUpload}
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                                className="hidden"
                            />
                        </label>
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-red-500 w-full">{error}</p>}

            {folderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                        <h2 className="text-sm font-semibold text-slate-900 mb-3">New folder</h2>
                        <input
                            autoFocus
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                            placeholder="Folder name"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                        />
                        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleCreateFolder}
                                disabled={isPending}
                                className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                            >
                                {isPending ? "Creating..." : "Create"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFolderModalOpen(false);
                                    setError("");
                                    setFolderName("");
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
