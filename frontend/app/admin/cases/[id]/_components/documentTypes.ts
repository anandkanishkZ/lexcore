export interface FolderRow {
    _id: string;
    name: string;
    starred?: boolean;
    createdAt?: string;
    createdBy?: { firstName: string; lastName: string };
}

export interface FileRow {
    _id: string;
    name: string;
    mimeType: string;
    size: number;
    starred?: boolean;
    uploadedBy?: { firstName: string; lastName: string };
    createdAt: string;
}

export interface BreadcrumbEntry {
    _id: string;
    name: string;
}

export type EntryTarget = { type: "file" | "folder"; id: string; name: string };

export type DocumentsMode = "normal" | "trash";
