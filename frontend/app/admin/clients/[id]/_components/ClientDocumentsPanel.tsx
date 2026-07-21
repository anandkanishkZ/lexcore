import { FileText, AlertCircle } from "lucide-react";
import { fetchClientDocumentsAction } from "@/lib/actions/document";

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ClientDocumentsPanel({ clientId }: { clientId: string }) {
    const result = await fetchClientDocumentsAction(clientId);

    if (!result.success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load documents</p>
                <p className="text-xs text-slate-500 mt-1">{result.message}</p>
            </div>
        );
    }

    const files: any[] = result.data ?? [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                {files.length} document{files.length === 1 ? "" : "s"} across all cases
            </p>

            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No documents yet</p>
                    <p className="text-xs text-slate-500 mt-1">Files uploaded to this client&apos;s cases will show up here.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {files.map((f) => (
                        <a
                            key={f._id}
                            href={f.case ? `/admin/cases/${f.case._id}?tab=documents` : undefined}
                            className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{f.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {f.case?.title ?? "Unknown case"} &middot; {formatSize(f.size)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">
                                {new Date(f.createdAt).toLocaleDateString()}
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
