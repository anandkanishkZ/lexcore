import { FileText, FileImage, FileSpreadsheet, File as FileIcon, type LucideIcon } from "lucide-react";

/**
 * Single source of truth for how a file is presented (icon + brand-ish color,
 * size/date formatting, previewability) — shared by the list view, grid view,
 * preview modal, and the cross-case Documents page so every surface speaks the
 * same visual language, à la Google Drive's colored file-type icons.
 */

export interface FileMeta {
    Icon: LucideIcon;
    /** Tailwind text-color class for the icon. */
    color: string;
    /** Tailwind bg tint for the icon chip in list rows. */
    tint: string;
    label: string;
}

const WORD_TYPES = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const EXCEL_TYPES = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export function fileMeta(mimeType: string): FileMeta {
    if (mimeType === "application/pdf") {
        return { Icon: FileText, color: "text-red-500", tint: "bg-red-50", label: "PDF" };
    }
    if (mimeType.startsWith("image/")) {
        return { Icon: FileImage, color: "text-emerald-500", tint: "bg-emerald-50", label: "Image" };
    }
    if (WORD_TYPES.includes(mimeType)) {
        return { Icon: FileText, color: "text-blue-500", tint: "bg-blue-50", label: "Word" };
    }
    if (EXCEL_TYPES.includes(mimeType)) {
        return { Icon: FileSpreadsheet, color: "text-green-600", tint: "bg-green-50", label: "Excel" };
    }
    return { Icon: FileIcon, color: "text-slate-400", tint: "bg-slate-100", label: "File" };
}

export function isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/");
}

export function isPreviewable(mimeType: string): boolean {
    return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value: string): string {
    return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Same-origin route-handler URL that streams a file's bytes (auth handled by
 * the handler reading the httpOnly cookie). Safe for <img>/<iframe>/<a>. */
export function downloadUrl(id: string): string {
    return `/api/documents/${id}/download`;
}
