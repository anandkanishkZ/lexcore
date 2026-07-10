import { AlertCircle } from "lucide-react";
import { fetchDocumentsAction, fetchTrashAction } from "@/lib/actions/document";
import DocumentsToolbar from "./DocumentsToolbar";
import DocumentsList from "./DocumentsList";
import DocumentsGrid from "./DocumentsGrid";
import DocumentsDropZone from "./DocumentsDropZone";
import type { BreadcrumbEntry, FileRow, FolderRow } from "./documentTypes";

export default async function DocumentsPanel({
    caseId,
    folderId,
    layout = "list",
    trashView = false,
    search,
    type,
    sortBy,
    sortOrder,
}: {
    caseId: string;
    folderId?: string;
    layout?: "list" | "grid";
    trashView?: boolean;
    search?: string;
    type?: string;
    sortBy?: "name" | "size" | "createdAt";
    sortOrder?: "asc" | "desc";
}) {
    const result = trashView
        ? await fetchTrashAction(caseId)
        : await fetchDocumentsAction(caseId, folderId, { search, type, sortBy, sortOrder });

    if (!result.success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load documents</p>
                <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
            </div>
        );
    }

    const currentFolder: { _id: string; name: string } | null = trashView ? null : result.data.folder;
    const breadcrumb: BreadcrumbEntry[] = trashView ? [] : result.data.breadcrumb ?? [];
    const folders: FolderRow[] = result.data.folders;
    const files: FileRow[] = result.data.files;

    const View = layout === "grid" ? DocumentsGrid : DocumentsList;
    const content = <View caseId={caseId} folders={folders} files={files} mode={trashView ? "trash" : "normal"} />;

    return (
        <div>
            <DocumentsToolbar
                caseId={caseId}
                folderId={folderId}
                breadcrumb={breadcrumb}
                currentFolderName={currentFolder?.name}
                layout={layout}
                trashView={trashView}
                search={search}
                type={type}
                sortBy={sortBy}
                sortOrder={sortOrder}
            />

            {trashView ? (
                content
            ) : (
                <DocumentsDropZone caseId={caseId} folderId={folderId}>
                    {content}
                </DocumentsDropZone>
            )}
        </div>
    );
}
