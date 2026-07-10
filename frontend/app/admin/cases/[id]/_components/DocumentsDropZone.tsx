"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { uploadDocument } from "@/lib/uploadDocument";

/** Wraps the documents grid so dropping files anywhere over it uploads them
 * into the currently open folder — reuses the exact same upload call the
 * click-to-browse button uses (lib/uploadDocument.ts), just triggered by a
 * drop event instead of a file input's change event. */
export default function DocumentsDropZone({
    caseId,
    folderId,
    children,
}: {
    caseId: string;
    folderId?: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        setError("");
        startTransition(async () => {
            const results = await Promise.all(files.map((file) => uploadDocument(caseId, folderId, file)));
            const failed = results.filter((r) => !r.success);
            if (failed.length > 0) {
                setError(failed.map((r) => r.message).join("; ") || "Some files failed to upload");
            }
            if (failed.length < files.length) router.refresh();
        });
    };

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDragging(false);
            }}
            onDrop={handleDrop}
            className="relative"
        >
            {children}

            {(isDragging || isPending) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-gold bg-brand-gold/5 pointer-events-none">
                    <div className="flex flex-col items-center gap-2 text-brand-gold">
                        <UploadCloud className="w-8 h-8" />
                        <p className="text-sm font-medium">{isPending ? "Uploading…" : "Drop files to upload"}</p>
                    </div>
                </div>
            )}

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
    );
}
