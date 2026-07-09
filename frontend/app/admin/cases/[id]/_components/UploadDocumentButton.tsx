"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

const MAX_SIZE = 20 * 1024 * 1024; // matches case-file-upload.middleware.ts

export default function UploadDocumentButton({
    caseId,
    folderId,
}: {
    caseId: string;
    folderId?: string;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file later
        if (!file) return;

        if (file.size > MAX_SIZE) {
            setError("File must be less than 20MB");
            return;
        }
        setError("");

        startTransition(async () => {
            const formData = new FormData();
            formData.append("file", file);

            const params = new URLSearchParams({ case: caseId });
            if (folderId) params.set("folder", folderId);

            const res = await fetch(`/api/documents?${params}`, {
                method: "POST",
                body: formData,
            });
            const result = await res.json();

            if (result.success) {
                router.refresh();
            } else {
                setError(result.message || "Upload failed");
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleChange}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
            >
                <Upload className="w-4 h-4" />
                {isPending ? "Uploading..." : "Upload"}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
