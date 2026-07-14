"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, History, Download, Upload } from "lucide-react";
import { fetchVersionsAction } from "@/lib/actions/document";
import { uploadNewVersion } from "@/lib/uploadDocument";
import { formatSize, formatDate, versionDownloadUrl } from "@/lib/fileMeta";

interface VersionRow {
    _id: string;
    versionNumber: number;
    name: string;
    size: number;
    createdAt: string;
    uploadedBy?: { firstName: string; lastName: string };
}

export default function VersionHistoryModal({
    caseId,
    file,
    onClose,
}: {
    caseId: string;
    file: { _id: string; name: string };
    onClose: () => void;
}) {
    const router = useRouter();
    const [versions, setVersions] = useState<VersionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadError, setUploadError] = useState("");
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadVersions = () => {
        fetchVersionsAction(file._id).then((result) => {
            if (result.success) setVersions(result.data);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadVersions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file._id]);

    const handleUpload = (selected: File | undefined) => {
        if (!selected) return;
        setUploadError("");
        startTransition(async () => {
            const result = await uploadNewVersion(file._id, caseId, selected);
            if (result.success) {
                loadVersions();
                router.refresh();
            } else {
                setUploadError(result.message || "Failed to upload new version");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold text-slate-900">Version history — &quot;{file.name}&quot;</h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                    Uploading a new version replaces the current content — older versions stay here to view or download.
                </p>

                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-gold hover:text-brand-gold transition disabled:opacity-60"
                >
                    <Upload className="w-4 h-4" />
                    {isPending ? "Uploading…" : "Upload New Version"}
                </button>
                {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}

                <div className="mt-5">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Previous versions</p>
                    {loading ? (
                        <p className="text-xs text-slate-400 py-3">Loading…</p>
                    ) : versions.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                            <History className="w-8 h-8 text-slate-300 mb-2" strokeWidth={1.5} />
                            <p className="text-xs text-slate-400">No previous versions yet.</p>
                        </div>
                    ) : (
                        <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100 -mx-1">
                            {versions.map((v) => (
                                <li key={v._id} className="flex items-center justify-between px-1 py-2.5">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-700">
                                            Version {v.versionNumber}
                                            {v.uploadedBy && (
                                                <span className="text-slate-400"> · {v.uploadedBy.firstName} {v.uploadedBy.lastName}</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatSize(v.size)} · {formatDate(v.createdAt)}
                                        </p>
                                    </div>
                                    <a
                                        href={versionDownloadUrl(file._id, v._id)}
                                        download={v.name}
                                        title="Download this version"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
