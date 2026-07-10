"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, Home } from "lucide-react";
import { fetchMoveTargetsAction, moveDocumentAction, moveFolderAction } from "@/lib/actions/document";

interface FolderNode {
    _id: string;
    name: string;
    parent: string | null;
}

function buildTree(folders: FolderNode[], parent: string | null): FolderNode[] {
    return folders.filter((f) => (f.parent ?? null) === parent);
}

function FolderRows({
    folders,
    parent,
    depth,
    onPick,
}: {
    folders: FolderNode[];
    parent: string | null;
    depth: number;
    onPick: (id: string | null) => void;
}) {
    const children = buildTree(folders, parent);
    return (
        <>
            {children.map((f) => (
                <div key={f._id}>
                    <button
                        onClick={() => onPick(f._id)}
                        style={{ paddingLeft: `${12 + depth * 20}px` }}
                        className="w-full flex items-center gap-2 py-2 pr-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition text-left"
                    >
                        <FolderIcon className="w-4 h-4 text-brand-gold shrink-0" />
                        <span className="truncate">{f.name}</span>
                    </button>
                    <FolderRows folders={folders} parent={f._id} depth={depth + 1} onPick={onPick} />
                </div>
            ))}
        </>
    );
}

export default function MoveModal({
    caseId,
    target,
    onClose,
}: {
    caseId: string;
    target: { type: "file" | "folder"; id: string; name: string };
    onClose: () => void;
}) {
    const router = useRouter();
    const [folders, setFolders] = useState<FolderNode[] | null>(null);
    const [error, setError] = useState("");
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        const excludeId = target.type === "folder" ? target.id : undefined;
        fetchMoveTargetsAction(caseId, excludeId).then((result) => {
            if (result.success) {
                setFolders(result.data);
            } else {
                setError(result.message || "Failed to load folders");
            }
        });
    }, [caseId, target.id, target.type]);

    const handleMove = async (destination: string | null) => {
        setIsMoving(true);
        const action = target.type === "file" ? moveDocumentAction : moveFolderAction;
        const result = await action(caseId, target.id, destination);
        if (result.success) {
            onClose();
            router.refresh();
        } else {
            setError(result.message || "Failed to move");
            setIsMoving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 max-h-[80vh] flex flex-col">
                <h2 className="text-sm font-semibold text-slate-900 mb-1">
                    Move &ldquo;{target.name}&rdquo;
                </h2>
                <p className="text-xs text-slate-500 mb-3">Choose a destination folder.</p>

                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg py-1">
                    <button
                        onClick={() => handleMove(null)}
                        disabled={isMoving}
                        className="w-full flex items-center gap-2 py-2 px-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition text-left disabled:opacity-60"
                    >
                        <Home className="w-4 h-4 text-slate-400 shrink-0" />
                        Root
                    </button>
                    {folders === null ? (
                        <p className="px-3 py-2 text-xs text-slate-400">Loading folders…</p>
                    ) : (
                        <FolderRows folders={folders} parent={null} depth={0} onPick={handleMove} />
                    )}
                </div>

                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

                <div className="pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isMoving}
                        className="w-full rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
