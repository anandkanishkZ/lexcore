"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Star,
    Pencil,
    FolderInput,
    Copy,
    Trash2,
    RotateCcw,
    Download,
    ExternalLink,
    AlertTriangle,
    Share2,
    History,
} from "lucide-react";
import {
    trashDocumentAction,
    trashFolderAction,
    restoreDocumentAction,
    restoreFolderAction,
    permanentlyDeleteDocumentAction,
    permanentlyDeleteFolderAction,
    toggleStarDocumentAction,
    toggleStarFolderAction,
    copyDocumentAction,
} from "@/lib/actions/document";
import { downloadUrl } from "@/lib/fileMeta";
import type { EntryTarget, FileRow, FolderRow, DocumentsMode } from "./documentTypes";
import RenameModal from "./RenameModal";
import MoveModal from "./MoveModal";
import ShareModal from "./ShareModal";
import VersionHistoryModal from "./VersionHistoryModal";

export interface MenuItem {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    href?: string;
    download?: string;
    newTab?: boolean;
    danger?: boolean;
}

/**
 * The one place that knows every document action. Both the list and grid views
 * consume this hook so they share identical menus, modals, and the right-click
 * context menu — Drive's core interaction model, defined once.
 *
 * Returns `menuItemsFor(entry)` to build a menu for a row/card, `openContextMenu`
 * to raise that same menu at the cursor on right-click, and `overlay` (rendered
 * once by the caller) which hosts the floating context menu plus all modals.
 */
export function useDocumentActions(caseId: string, mode: DocumentsMode) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [deleteTarget, setDeleteTarget] = useState<EntryTarget | null>(null);
    const [renameTarget, setRenameTarget] = useState<EntryTarget | null>(null);
    const [moveTarget, setMoveTarget] = useState<EntryTarget | null>(null);
    const [shareTarget, setShareTarget] = useState<{ _id: string; name: string } | null>(null);
    const [versionsTarget, setVersionsTarget] = useState<{ _id: string; name: string } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

    const runAndRefresh = (action: () => Promise<{ success: boolean; message?: string }>) => {
        startTransition(async () => {
            const result = await action();
            if (result.success) router.refresh();
        });
    };

    function folderMenu(folder: FolderRow): MenuItem[] {
        if (mode === "trash") {
            return [
                { label: "Restore", icon: <RotateCcw className="w-3.5 h-3.5" />, onClick: () => runAndRefresh(() => restoreFolderAction(caseId, folder._id)) },
                { label: "Delete forever", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setDeleteTarget({ type: "folder", id: folder._id, name: folder.name }), danger: true },
            ];
        }
        return [
            { label: folder.starred ? "Remove from starred" : "Add to starred", icon: <Star className="w-3.5 h-3.5" />, onClick: () => runAndRefresh(() => toggleStarFolderAction(caseId, folder._id, !folder.starred)) },
            { label: "Rename", icon: <Pencil className="w-3.5 h-3.5" />, onClick: () => setRenameTarget({ type: "folder", id: folder._id, name: folder.name }) },
            { label: "Move", icon: <FolderInput className="w-3.5 h-3.5" />, onClick: () => setMoveTarget({ type: "folder", id: folder._id, name: folder.name }) },
            { label: "Move to trash", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setDeleteTarget({ type: "folder", id: folder._id, name: folder.name }), danger: true },
        ];
    }

    function fileMenu(file: FileRow): MenuItem[] {
        if (mode === "trash") {
            return [
                { label: "Restore", icon: <RotateCcw className="w-3.5 h-3.5" />, onClick: () => runAndRefresh(() => restoreDocumentAction(caseId, file._id)) },
                { label: "Delete forever", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setDeleteTarget({ type: "file", id: file._id, name: file.name }), danger: true },
            ];
        }
        return [
            { label: "Open in new tab", icon: <ExternalLink className="w-3.5 h-3.5" />, href: downloadUrl(file._id), newTab: true },
            { label: "Download", icon: <Download className="w-3.5 h-3.5" />, href: downloadUrl(file._id), download: file.name },
            { label: file.starred ? "Remove from starred" : "Add to starred", icon: <Star className="w-3.5 h-3.5" />, onClick: () => runAndRefresh(() => toggleStarDocumentAction(caseId, file._id, !file.starred)) },
            { label: "Rename", icon: <Pencil className="w-3.5 h-3.5" />, onClick: () => setRenameTarget({ type: "file", id: file._id, name: file.name }) },
            { label: "Move", icon: <FolderInput className="w-3.5 h-3.5" />, onClick: () => setMoveTarget({ type: "file", id: file._id, name: file.name }) },
            { label: "Make a copy", icon: <Copy className="w-3.5 h-3.5" />, onClick: () => runAndRefresh(() => copyDocumentAction(caseId, file._id)) },
            { label: "Share", icon: <Share2 className="w-3.5 h-3.5" />, onClick: () => setShareTarget({ _id: file._id, name: file.name }) },
            { label: "Version history", icon: <History className="w-3.5 h-3.5" />, onClick: () => setVersionsTarget({ _id: file._id, name: file.name }) },
            { label: "Move to trash", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setDeleteTarget({ type: "file", id: file._id, name: file.name }), danger: true },
        ];
    }

    function menuItemsFor(entry: { kind: "file"; row: FileRow } | { kind: "folder"; row: FolderRow }): MenuItem[] {
        return entry.kind === "file" ? fileMenu(entry.row) : folderMenu(entry.row);
    }

    function openContextMenu(e: React.MouseEvent, items: MenuItem[]) {
        e.preventDefault();
        // Clamp so the menu never overflows the viewport edge.
        const x = Math.min(e.clientX, window.innerWidth - 190);
        const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 16);
        setContextMenu({ x, y, items });
    }

    const overlay = (
        <>
            {contextMenu && (
                <FloatingMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={() => setContextMenu(null)}
                />
            )}
            {deleteTarget && (
                <DeleteEntryModal
                    caseId={caseId}
                    target={deleteTarget}
                    permanent={mode === "trash"}
                    onClose={() => setDeleteTarget(null)}
                    onSuccess={() => {
                        setDeleteTarget(null);
                        router.refresh();
                    }}
                />
            )}
            {renameTarget && <RenameModal caseId={caseId} target={renameTarget} onClose={() => setRenameTarget(null)} />}
            {moveTarget && <MoveModal caseId={caseId} target={moveTarget} onClose={() => setMoveTarget(null)} />}
            {shareTarget && <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />}
            {versionsTarget && (
                <VersionHistoryModal caseId={caseId} file={versionsTarget} onClose={() => setVersionsTarget(null)} />
            )}
        </>
    );

    return { menuItemsFor, openContextMenu, overlay };
}

// --- Floating menu (shared by ⋮ dropdown and right-click) --------------------

function MenuItemRow({ item, onDone }: { item: MenuItem; onDone: () => void }) {
    const className = `w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-slate-50 transition ${
        item.danger ? "text-red-600" : "text-slate-700"
    }`;

    if (item.href) {
        return (
            <a
                href={item.href}
                download={item.download}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noopener noreferrer" : undefined}
                className={className}
                onClick={onDone}
            >
                {item.icon}
                {item.label}
            </a>
        );
    }
    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDone();
                item.onClick?.();
            }}
            className={className}
        >
            {item.icon}
            {item.label}
        </button>
    );
}

/** Fixed-position menu used for right-click; auto-closes on outside click/scroll. */
function FloatingMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("scroll", onClose, true);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("scroll", onClose, true);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            style={{ top: y, left: x }}
            className="fixed z-50 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1"
        >
            {items.map((item, i) => (
                <MenuItemRow key={i} item={item} onDone={onClose} />
            ))}
        </div>
    );
}

const MENU_WIDTH = 192; // w-48
const MENU_ITEM_HEIGHT = 34;

/** Inline "⋮" trigger for a row/card. Opens the shared FloatingMenu with
 * fixed positioning anchored under the button — this escapes the documents
 * table's `overflow-hidden`/`overflow-x-auto` container, which would otherwise
 * clip an absolutely-positioned dropdown (especially on the last row). */
export function OverflowButton({ items }: { items: MenuItem[] }) {
    const btnRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    const openMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (pos) {
            setPos(null);
            return;
        }
        const r = btnRef.current!.getBoundingClientRect();
        const menuHeight = items.length * MENU_ITEM_HEIGHT + 8;
        // Right-align under the button; flip upward if it would overflow bottom.
        const x = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
        const y = r.bottom + menuHeight > window.innerHeight - 8 ? Math.max(8, r.top - menuHeight - 4) : r.bottom + 4;
        setPos({ x, y });
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={openMenu}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <circle cx="12" cy="5" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="12" cy="19" r="1.6" />
                </svg>
            </button>
            {pos && <FloatingMenu x={pos.x} y={pos.y} items={items} onClose={() => setPos(null)} />}
        </>
    );
}

// --- Delete/trash confirmation modal ---------------------------------------

function DeleteEntryModal({
    caseId,
    target,
    permanent,
    onClose,
    onSuccess,
}: {
    caseId: string;
    target: EntryTarget;
    permanent: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleDelete = () => {
        setError("");
        startTransition(async () => {
            const action = permanent
                ? target.type === "file"
                    ? permanentlyDeleteDocumentAction
                    : permanentlyDeleteFolderAction
                : target.type === "file"
                  ? trashDocumentAction
                  : trashFolderAction;
            const result = await action(caseId, target.id);
            if (result.success) onSuccess();
            else setError(result.message || `Failed to delete ${target.type}`);
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
                        {permanent ? "Delete forever" : "Move to trash"}
                    </h2>
                </div>
                <p className="text-sm text-slate-600">
                    Are you sure you want to {permanent ? "permanently delete" : "move to trash"}{" "}
                    <span className="font-medium text-slate-900">{target.name}</span>?{" "}
                    {permanent ? "This action cannot be undone." : "You can restore it from Trash later."}
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
                        {isPending ? "Working..." : permanent ? "Delete forever" : "Move to trash"}
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
