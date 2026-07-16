"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { caseSchema, CaseFormData, CASE_TYPES, CASE_STATUSES } from "./schema";
import { createCaseAction, updateCaseAction } from "@/lib/actions/case";
import { TextField, TextAreaField, SelectField } from "../../_components/FormField";

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

            <TextField label="Case Title" type="text" placeholder="e.g. Smith v. Jones" error={errors.title?.message} {...register("title")} />

            {/* Type + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField label="Case Type" error={errors.type?.message} {...register("type")}>
                    {CASE_TYPES.map((t) => (
                        <option key={t} value={t} className="capitalize">
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Status" {...register("status")}>
                    {CASE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                    ))}
                </SelectField>
            </div>

            <SelectField label="Client" error={errors.client?.message} {...register("client")}>
                <option value="">— Select a client —</option>
                {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                        {c.firstName} {c.lastName} ({c.email})
                    </option>
                ))}
            </SelectField>

            <SelectField
                label={
                    <>
                        Assigned Attorney <span className="text-slate-400 font-normal">(optional)</span>
                    </>
                }
                {...register("assignedAttorney")}
            >
                <option value="">— Unassigned —</option>
                {attorneys.map((a) => (
                    <option key={a._id} value={a._id}>
                        {a.firstName} {a.lastName} — {a.userType}
                    </option>
                ))}
            </SelectField>

            {/* Open Date + Close Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Open Date" type="date" {...register("openDate")} />
                {mode === "edit" && (
                    <TextField
                        label={
                            <>
                                Close Date <span className="text-slate-400 font-normal">(optional)</span>
                            </>
                        }
                        type="date"
                        {...register("closeDate")}
                    />
                )}
            </div>

            <TextAreaField
                label={
                    <>
                        Description <span className="text-slate-400 font-normal">(optional)</span>
                    </>
                }
                placeholder="Brief summary of the case…"
                rows={3}
                {...register("description")}
            />

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
