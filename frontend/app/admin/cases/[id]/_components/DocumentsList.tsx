"use client";

import { useRouter } from "next/navigation";
import { Folder as FolderIcon, Star, FolderOpen } from "lucide-react";
import { fileMeta, formatSize, formatDate } from "@/lib/fileMeta";
import { useDocumentActions, OverflowButton } from "./useDocumentActions";
import PreviewModal from "./PreviewModal";
import { useState } from "react";
import type { FileRow, FolderRow, DocumentsMode } from "./documentTypes";

export default function DocumentsList({
    caseId,
    folders,
    files,
    mode = "normal",
}: {
    caseId: string;
    folders: FolderRow[];
    files: FileRow[];
    mode?: DocumentsMode;
}) {
    const router = useRouter();
    const actions = useDocumentActions(caseId, mode);
    const [preview, setPreview] = useState<FileRow | null>(null);

    if (folders.length === 0 && files.length === 0) {
        return <EmptyState trash={mode === "trash"} />;
    }

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                <th className="text-left px-5 py-3">Name</th>
                                <th className="text-left px-5 py-3 hidden sm:table-cell">Owner</th>
                                <th className="text-left px-5 py-3 hidden md:table-cell">Modified</th>
                                <th className="text-left px-5 py-3 hidden lg:table-cell">Size</th>
                                <th className="px-5 py-3 w-10" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {folders.map((folder) => {
                                const items = actions.menuItemsFor({ kind: "folder", row: folder });
                                const owner = folder.createdBy ? `${folder.createdBy.firstName} ${folder.createdBy.lastName}` : "—";
                                const navigate = () => {
                                    if (mode !== "trash") router.push(`/admin/cases/${caseId}?tab=documents&folder=${folder._id}`);
                                };
                                return (
                                    <tr
                                        key={folder._id}
                                        onDoubleClick={navigate}
                                        onContextMenu={(e) => actions.openContextMenu(e, items)}
                                        className="hover:bg-slate-50 transition group cursor-default"
                                    >
                                        <td className="px-5 py-3">
                                            <button onClick={navigate} className="flex items-center gap-2.5 text-left w-full">
                                                <FolderIcon className="w-4 h-4 text-brand-gold shrink-0" fill="currentColor" strokeWidth={0} />
                                                <span className="font-medium text-slate-800 truncate">{folder.name}</span>
                                                {folder.starred && <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold shrink-0" />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{owner}</td>
                                        <td className="px-5 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                                            {folder.createdAt ? formatDate(folder.createdAt) : "—"}
                                        </td>
                                        <td className="px-5 py-3 text-slate-400 hidden lg:table-cell">—</td>
                                        <td className="px-5 py-3">
                                            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex justify-end">
                                                <OverflowButton items={items} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {files.map((file) => {
                                const items = actions.menuItemsFor({ kind: "file", row: file });
                                const { Icon, color } = fileMeta(file.mimeType);
                                const owner = file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : "—";
                                const open = () => setPreview(file);
                                return (
                                    <tr
                                        key={file._id}
                                        onDoubleClick={open}
                                        onContextMenu={(e) => actions.openContextMenu(e, items)}
                                        className="hover:bg-slate-50 transition group cursor-default"
                                    >
                                        <td className="px-5 py-3">
                                            <button onClick={open} className="flex items-center gap-2.5 text-left w-full">
                                                <Icon className={`w-4 h-4 shrink-0 ${color}`} strokeWidth={1.75} />
                                                <span className="font-medium text-slate-800 truncate">{file.name}</span>
                                                {file.starred && <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold shrink-0" />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{owner}</td>
                                        <td className="px-5 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                                            {formatDate(file.createdAt)}
                                        </td>
                                        <td className="px-5 py-3 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                                            {formatSize(file.size)}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex justify-end">
                                                <OverflowButton items={items} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {actions.overlay}
            {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
        </>
    );
}

function EmptyState({ trash }: { trash: boolean }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <FolderOpen className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-slate-700">{trash ? "Trash is empty" : "No documents yet"}</p>
            {!trash && (
                <p className="text-xs text-slate-500 mt-1">Drag files here, or use New to upload or create a folder.</p>
            )}
        </div>
    );
}
