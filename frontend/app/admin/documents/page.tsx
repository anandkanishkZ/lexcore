import Link from "next/link";
import { AlertCircle, Clock, Star, LayoutGrid, List as ListIcon } from "lucide-react";
import { fetchRecentDocumentsAction, fetchStarredDocumentsAction } from "@/lib/actions/document";
import { fileMeta, formatSize, formatDate, isImage, downloadUrl } from "@/lib/fileMeta";

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

function EmptyState() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-slate-700">Nothing here yet</p>
        </div>
    );
}

function FilesTable({ files }: { files: FileRow[] }) {
    if (files.length === 0) return <EmptyState />;

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

function FilesGrid({ files }: { files: FileRow[] }) {
    if (files.length === 0) return <EmptyState />;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.map((file) => {
                const { Icon, color, tint } = fileMeta(file.mimeType);
                const showThumb = isImage(file.mimeType);
                return (
                    <a
                        key={file._id}
                        href={downloadUrl(file._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-brand-gold hover:shadow-sm transition"
                    >
                        {file.starred && (
                            <Star className="absolute top-2 left-2 z-10 w-3.5 h-3.5 text-brand-gold fill-brand-gold drop-shadow" />
                        )}
                        <div className={`h-28 flex items-center justify-center ${showThumb ? "bg-slate-100" : tint}`}>
                            {showThumb ? (
                                // eslint-disable-next-line @next/next/no-img-element -- same-origin route-handler URL, not an optimizable static asset
                                <img
                                    src={downloadUrl(file._id)}
                                    alt={file.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Icon className={`w-10 h-10 ${color}`} strokeWidth={1.25} />
                            )}
                        </div>
                        <div className="px-3 py-2.5 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {file.case ? file.case.title : "—"} &middot; {formatSize(file.size)}
                            </p>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

export default async function DocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{ view?: string; layout?: string }>;
}) {
    const { view, layout: layoutParam } = await searchParams;
    const isStarred = view === "starred";
    const layout = layoutParam === "grid" ? "grid" : "list";

    // Preserve the active tab (view) when switching layout, and vice versa.
    const tabHref = (v: "recent" | "starred") => {
        const params = new URLSearchParams();
        if (v === "starred") params.set("view", "starred");
        if (layout === "grid") params.set("layout", "grid");
        const qs = params.toString();
        return qs ? `/admin/documents?${qs}` : "/admin/documents";
    };
    const layoutHref = (l: "list" | "grid") => {
        const params = new URLSearchParams();
        if (isStarred) params.set("view", "starred");
        if (l === "grid") params.set("layout", "grid");
        const qs = params.toString();
        return qs ? `/admin/documents?${qs}` : "/admin/documents";
    };

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
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-fit">
                    <Link
                        href={tabHref("recent")}
                        className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition ${
                            !isStarred ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Recent
                    </Link>
                    <Link
                        href={tabHref("starred")}
                        className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition ${
                            isStarred ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <Star className="w-3.5 h-3.5" />
                        Starred
                    </Link>
                </div>

                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    <Link
                        href={layoutHref("list")}
                        title="List view"
                        className={`rounded-md p-1.5 transition ${layout === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <ListIcon className="w-4 h-4" />
                    </Link>
                    <Link
                        href={layoutHref("grid")}
                        title="Grid view"
                        className={`rounded-md p-1.5 transition ${layout === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {layout === "grid" ? <FilesGrid files={files} /> : <FilesTable files={files} />}
        </div>
    );
}
