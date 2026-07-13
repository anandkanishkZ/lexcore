"use client";

import { useState, useTransition } from "react";
import { FilePlus2 } from "lucide-react";
import { createDocumentRequestAction } from "@/lib/actions/document-request";

export default function NewDocumentRequestModal({
    caseId,
    onClose,
    onSuccess,
}: {
    caseId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    const handleCreate = () => {
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        setError("");
        startTransition(async () => {
            const result = await createDocumentRequestAction(caseId, {
                title: title.trim(),
                description: description.trim() || undefined,
            });
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Failed to create document request");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
                        <FilePlus2 className="w-5 h-5 text-brand-gold" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-900">Request a document</h2>
                </div>

                <p className="text-sm text-slate-600">
                    The client will see this request and can upload the file directly from the app.
                </p>

                <div className="mt-4 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Proof of ID"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Description <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Any details the client needs, e.g. must be issued in the last 3 months"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white resize-none"
                        />
                    </div>
                </div>

                {error && (
                    <p className="mt-3 text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleCreate}
                        disabled={isPending}
                        className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Sending..." : "Send Request"}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
