"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, FileText, Trash2, AlertTriangle, X, Download } from "lucide-react";
import { deleteDocumentAction, deleteFolderAction } from "@/lib/actions/document";

interface FolderRow {
    _id: string;
    name: string;
}

interface FileRow {
    _id: string;
    name: string;
    mimeType: string;
    size: number;
    uploadedBy?: { firstName: string; lastName: string };
    createdAt: string;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsGrid({
    caseId,
    folders,
    files,
}: {
    caseId: string;
    folders: FolderRow[];
    files: FileRow[];
}) {
    const router = useRouter();
    const [deleteTarget, setDeleteTarget] = useState<
        { type: "file" | "folder"; id: string; name: string } | null
    >(null);
    const [previewTarget, setPreviewTarget] = useState<FileRow | null>(null);

    if (folders.length === 0 && files.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium text-slate-700">This folder is empty</p>
                <p className="text-xs text-slate-500 mt-1">Upload a file or create a subfolder to get started.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {folders.map((f) => (
                    <div
                        key={f._id}
                        className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-gold transition"
                    >
                        <a href={`?tab=documents&folder=${f._id}`} className="flex flex-col items-center text-center gap-2">
                            <FolderIcon className="w-9 h-9 text-brand-gold" strokeWidth={1.5} />
                            <p className="text-xs font-medium text-slate-700 truncate w-full">{f.name}</p>
                        </a>
                        <button
                            onClick={() => setDeleteTarget({ type: "folder", id: f._id, name: f.name })}
                            title="Delete folder"
                            className="absolute top-2 right-2 p-1 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}

                {files.map((file) => (
                    <div
                        key={file._id}
                        className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-gold transition"
                    >
                        <button
                            onClick={() => setPreviewTarget(file)}
                            className="flex flex-col items-center text-center gap-2 w-full"
                        >
                            <FileText className="w-9 h-9 text-slate-400" strokeWidth={1.5} />
                            <p className="text-xs font-medium text-slate-700 truncate w-full">{file.name}</p>
                            <p className="text-[11px] text-slate-400">{formatSize(file.size)}</p>
                        </button>
                        <button
                            onClick={() => setDeleteTarget({ type: "file", id: file._id, name: file.name })}
                            title="Delete file"
                            className="absolute top-2 right-2 p-1 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {deleteTarget && (
                <DeleteEntryModal
                    caseId={caseId}
                    target={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onSuccess={() => {
                        setDeleteTarget(null);
                        router.refresh();
                    }}
                />
            )}

            {previewTarget && (
                <PreviewModal file={previewTarget} onClose={() => setPreviewTarget(null)} />
            )}
        </>
    );
}

function DeleteEntryModal({
    caseId,
    target,
    onClose,
    onSuccess,
}: {
    caseId: string;
    target: { type: "file" | "folder"; id: string; name: string };
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleDelete = () => {
        setError("");
        startTransition(async () => {
            const action = target.type === "file" ? deleteDocumentAction : deleteFolderAction;
            const result = await action(caseId, target.id);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || `Failed to delete ${target.type}`);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">
                        Delete {target.type === "file" ? "file" : "folder"}
                    </h2>
                </div>

                <p className="text-sm text-slate-600">
                    Are you sure you want to delete <span className="font-medium text-slate-900">{target.name}</span>?
                    This action cannot be undone.
                </p>

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Deleting..." : "Delete"}
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

function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
    const src = `/api/documents/${file._id}/download`;
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl h-[80vh] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-1">
                        <a
                            href={src}
                            download={file.name}
                            title="Download"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                        <button
                            onClick={onClose}
                            title="Close"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-50 flex items-center justify-center overflow-auto">
                    {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element -- same-origin route-handler URL, not an optimizable static asset
                        <img src={src} alt={file.name} className="max-w-full max-h-full object-contain" />
                    ) : isPdf ? (
                        <iframe src={src} title={file.name} className="w-full h-full border-0" />
                    ) : (
                        <p className="text-sm text-slate-500">
                            No inline preview for this file type — use Download instead.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
