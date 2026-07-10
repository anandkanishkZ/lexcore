"use client";

import { X, Download, ExternalLink } from "lucide-react";
import { downloadUrl, isImage, fileMeta } from "@/lib/fileMeta";
import type { FileRow } from "./documentTypes";

export default function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
    const src = downloadUrl(file._id);
    const image = isImage(file.mimeType);
    const isPdf = file.mimeType === "application/pdf";
    const { Icon, color } = fileMeta(file.mimeType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="w-full max-w-4xl h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${color}`} strokeWidth={1.75} />
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href={src}
                            download={file.name}
                            title="Download"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                        >
                            <Download className="w-4 h-4" />
                        </a>
                        <button
                            onClick={onClose}
                            title="Close"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto">
                    {image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- same-origin route-handler URL, not an optimizable static asset
                        <img src={src} alt={file.name} className="max-w-full max-h-full object-contain" />
                    ) : isPdf ? (
                        <iframe src={src} title={file.name} className="w-full h-full border-0" />
                    ) : (
                        <div className="flex flex-col items-center gap-3 text-center px-6">
                            <Icon className={`w-12 h-12 ${color}`} strokeWidth={1.25} />
                            <p className="text-sm text-slate-500">
                                No inline preview for this file type.{" "}
                                <a href={src} download={file.name} className="text-brand-gold hover:underline">
                                    Download
                                </a>{" "}
                                to view it.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
