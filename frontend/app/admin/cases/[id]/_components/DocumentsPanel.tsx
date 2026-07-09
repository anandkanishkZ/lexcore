import { AlertCircle, ChevronRight, Home } from "lucide-react";
import { fetchDocumentsAction } from "@/lib/actions/document";
import DocumentsGrid from "./DocumentsGrid";
import UploadDocumentButton from "./UploadDocumentButton";
import CreateFolderButton from "./CreateFolderButton";

export default async function DocumentsPanel({
    caseId,
    folderId,
}: {
    caseId: string;
    folderId?: string;
}) {
    const result = await fetchDocumentsAction(caseId, folderId);

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

    const { folder, folders, files } = result.data as {
        folder: { _id: string; name: string } | null;
        folders: { _id: string; name: string }[];
        files: {
            _id: string;
            name: string;
            mimeType: string;
            size: number;
            uploadedBy?: { firstName: string; lastName: string };
            createdAt: string;
        }[];
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                {/* Breadcrumb is intentionally shallow (Root / current folder only,
                    not the full ancestor chain) — see DocumentService.list. */}
                <div className="flex items-center gap-1.5 text-sm">
                    <a
                        href={`?tab=documents`}
                        className={`flex items-center gap-1 ${folder ? "text-slate-500 hover:text-slate-700" : "text-slate-900 font-medium"}`}
                    >
                        <Home className="w-3.5 h-3.5" />
                        Root
                    </a>
                    {folder && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-slate-900 font-medium">{folder.name}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <CreateFolderButton caseId={caseId} parentId={folderId} />
                    <UploadDocumentButton caseId={caseId} folderId={folderId} />
                </div>
            </div>

            <DocumentsGrid caseId={caseId} folders={folders} files={files} />
        </div>
    );
}
