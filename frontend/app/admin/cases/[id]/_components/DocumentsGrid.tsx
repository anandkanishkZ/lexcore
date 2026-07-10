"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, Star, FolderOpen } from "lucide-react";
import { fileMeta, formatSize, isImage, downloadUrl } from "@/lib/fileMeta";
import { useDocumentActions, OverflowButton, type MenuItem } from "./useDocumentActions";
import PreviewModal from "./PreviewModal";
import type { FileRow, FolderRow, DocumentsMode } from "./documentTypes";

export default function DocumentsGrid({
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
            {folders.length > 0 && (
                <section className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Folders</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {folders.map((folder) => {
                            const items = actions.menuItemsFor({ kind: "folder", row: folder });
                            const navigate = () => {
                                if (mode !== "trash")
                                    router.push(`/admin/cases/${caseId}?tab=documents&layout=grid&folder=${folder._id}`);
                            };
                            return (
                                <div
                                    key={folder._id}
                                    onDoubleClick={navigate}
                                    onContextMenu={(e) => actions.openContextMenu(e, items)}
                                    className="group relative flex items-center gap-2.5 bg-white rounded-xl border border-slate-200 px-3 py-3 hover:border-brand-gold hover:shadow-sm transition cursor-pointer"
                                >
                                    <button onClick={navigate} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                                        <FolderIcon className="w-5 h-5 text-brand-gold shrink-0" fill="currentColor" strokeWidth={0} />
                                        <span className="text-sm font-medium text-slate-700 truncate">{folder.name}</span>
                                    </button>
                                    {folder.starred && <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold shrink-0" />}
                                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 shrink-0">
                                        <OverflowButton items={items} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {files.length > 0 && (
                <section>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Files</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {files.map((file) => {
                            const items = actions.menuItemsFor({ kind: "file", row: file });
                            return (
                                <FileCard
                                    key={file._id}
                                    file={file}
                                    items={items}
                                    onOpen={() => setPreview(file)}
                                    onContextMenu={(e) => actions.openContextMenu(e, items)}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {actions.overlay}
            {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
        </>
    );
}

function FileCard({
    file,
    items,
    onOpen,
    onContextMenu,
}: {
    file: FileRow;
    items: MenuItem[];
    onOpen: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}) {
    const { Icon, color, tint } = fileMeta(file.mimeType);
    const [thumbFailed, setThumbFailed] = useState(false);
    const showThumb = isImage(file.mimeType) && !thumbFailed;

    return (
        <div
            onDoubleClick={onOpen}
            onContextMenu={onContextMenu}
            className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-brand-gold hover:shadow-sm transition cursor-pointer"
        >
            {file.starred && (
                <Star className="absolute top-2 left-2 z-10 w-3.5 h-3.5 text-brand-gold fill-brand-gold drop-shadow" />
            )}
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <OverflowButton items={items} />
            </div>

            <button onClick={onOpen} className="block w-full text-left">
                {/* Thumbnail / icon area */}
                <div className={`h-28 flex items-center justify-center ${showThumb ? "bg-slate-100" : tint}`}>
                    {showThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- same-origin route-handler URL, not an optimizable static asset
                        <img
                            src={downloadUrl(file._id)}
                            alt={file.name}
                            loading="lazy"
                            onError={() => setThumbFailed(true)}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Icon className={`w-10 h-10 ${color}`} strokeWidth={1.25} />
                    )}
                </div>
                {/* Meta */}
                <div className="px-3 py-2.5 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>
                </div>
            </button>
        </div>
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
