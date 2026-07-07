"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { caseSchema, CaseFormData, CASE_TYPES, CASE_STATUSES } from "./schema";
import { createCaseAction, updateCaseAction } from "@/lib/actions/case";

interface ClientOption {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface AttorneyOption {
    _id: string;
    firstName: string;
    lastName: string;
    userType: string;
}

interface CaseFormProps {
    mode: "create" | "edit";
    caseId?: string;
    clients: ClientOption[];
    attorneys: AttorneyOption[];
    defaultValues?: Partial<CaseFormData>;
}

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white";

export default function CaseForm({ mode, caseId, clients, attorneys, defaultValues }: CaseFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CaseFormData>({
        resolver: zodResolver(caseSchema),
        defaultValues: { status: "open", ...defaultValues },
    });

    const onSubmit = (data: CaseFormData) => {
        setError("");
        // Strip empty optional strings so the backend treats them as absent
        const payload: any = { ...data };
        if (!payload.assignedAttorney) delete payload.assignedAttorney;
        if (!payload.openDate) delete payload.openDate;
        if (!payload.closeDate) delete payload.closeDate;
        if (!payload.description) delete payload.description;

        startTransition(async () => {
            try {
                const result =
                    mode === "create"
                        ? await createCaseAction(payload)
                        : await updateCaseAction(caseId!, payload);

                if (result.success) {
                    router.push("/admin/cases");
                } else {
                    setError(result.message || `Failed to ${mode} case`);
                }
            } catch (err: any) {
                setError(err?.message || `Failed to ${mode} case`);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <p className="text-sm text-red-500 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Title</label>
                <input
                    type="text"
                    {...register("title")}
                    placeholder="e.g. Smith v. Jones"
                    className={inputClass}
                />
                {errors.title && (
                    <span className="mt-1 block text-xs text-red-500">{errors.title.message}</span>
                )}
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Case Type</label>
                    <select {...register("type")} className={inputClass}>
                        {CASE_TYPES.map((t) => (
                            <option key={t} value={t} className="capitalize">
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                        ))}
                    </select>
                    {errors.type && (
                        <span className="mt-1 block text-xs text-red-500">{errors.type.message}</span>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                    <select {...register("status")} className={inputClass}>
                        {CASE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Client */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
                <select {...register("client")} className={inputClass}>
                    <option value="">— Select a client —</option>
                    {clients.map((c) => (
                        <option key={c._id} value={c._id}>
                            {c.firstName} {c.lastName} ({c.email})
                        </option>
                    ))}
                </select>
                {errors.client && (
                    <span className="mt-1 block text-xs text-red-500">{errors.client.message}</span>
                )}
            </div>

            {/* Assigned Attorney */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Assigned Attorney <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <select {...register("assignedAttorney")} className={inputClass}>
                    <option value="">— Unassigned —</option>
                    {attorneys.map((a) => (
                        <option key={a._id} value={a._id}>
                            {a.firstName} {a.lastName} — {a.userType}
                        </option>
                    ))}
                </select>
            </div>

            {/* Open Date + Close Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Open Date</label>
                    <input type="date" {...register("openDate")} className={inputClass} />
                </div>
                {mode === "edit" && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Close Date <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input type="date" {...register("closeDate")} className={inputClass} />
                    </div>
                )}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                    {...register("description")}
                    placeholder="Brief summary of the case…"
                    rows={3}
                    className={`${inputClass} resize-none`}
                />
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    {isPending
                        ? mode === "create" ? "Creating…" : "Updating…"
                        : mode === "create" ? "Create Case" : "Update Case"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/admin/cases")}
                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
