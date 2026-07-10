import Link from "next/link";
import { AlertCircle, Clock, Star } from "lucide-react";
import { fetchRecentDocumentsAction, fetchStarredDocumentsAction } from "@/lib/actions/document";
import { fileMeta, formatSize, formatDate } from "@/lib/fileMeta";

interface FileRow {
    _id: string;
    name: string;
    mimeType: string;
    size: number;
    starred?: boolean;
    createdAt: string;
    case?: { _id: string; title: string; caseNumber: string } | null;
    uploadedBy?: { firstName: string; lastName: string };
}

function FilesTable({ files }: { files: FileRow[] }) {
    if (files.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-medium text-slate-700">Nothing here yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            <th className="text-left px-5 py-3">Name</th>
                            <th className="text-left px-5 py-3">Case</th>
                            <th className="text-left px-5 py-3 hidden sm:table-cell">Uploaded By</th>
                            <th className="text-left px-5 py-3 hidden md:table-cell">Size</th>
                            <th className="text-left px-5 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {files.map((file) => {
                            const { Icon, color } = fileMeta(file.mimeType);
                            return (
                                <tr key={file._id} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-3">
                                        <Link
                                            href={`/api/documents/${file._id}/download`}
                                            target="_blank"
                                            className="flex items-center gap-2.5 min-w-0"
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${color}`} strokeWidth={1.75} />
                                            <span className="font-medium text-slate-800 truncate hover:underline">{file.name}</span>
                                            {file.starred && <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold shrink-0" />}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">
                                        {file.case ? (
                                            <Link
                                                href={`/admin/cases/${file.case._id}?tab=documents`}
                                                className="text-brand-gold hover:underline"
                                            >
                                                {file.case.title}
                                            </Link>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">
                                        {file.uploadedBy ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}` : "—"}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                                        {formatSize(file.size)}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                                        {formatDate(file.createdAt)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default async function DocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string }>;
}) {
    const { view } = await searchParams;
    const isStarred = view === "starred";

    const result = isStarred ? await fetchStarredDocumentsAction() : await fetchRecentDocumentsAction();

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

    // Recent returns a flat file array; Starred returns { files, folders }.
    // Folders aren't rendered here (this cross-case view is files-only — a
    // starred folder is still reachable from within its own case).
    const files: FileRow[] = isStarred ? result.data.files : result.data;

    return (
        <div>
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-fit mb-6">
                <Link
                    href="/admin/documents"
                    className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition ${
                        !isStarred ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Recent
                </Link>
                <Link
                    href="/admin/documents?view=starred"
                    className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition ${
                        isStarred ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    <Star className="w-3.5 h-3.5" />
                    Starred
                </Link>
            </div>

            <FilesTable files={files} />
        </div>
    );
}
