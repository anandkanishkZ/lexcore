"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { invoiceSchema, InvoiceFormData } from "./schema";
import { createInvoiceAction } from "@/lib/actions/invoice";
import { formatCurrency } from "./constants";

interface ClientOption {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface CaseOption {
    _id: string;
    title: string;
    caseNumber: string;
}

interface InvoiceFormProps {
    clients: ClientOption[];
    cases: CaseOption[];
}

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white";

export default function InvoiceForm({ clients, cases }: InvoiceFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<InvoiceFormData>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            items: [{ description: "", quantity: 1, rate: 0 }],
            taxRate: 0,
            status: "draft",
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });
    const watchedItems = watch("items");
    const taxRate = watch("taxRate") || 0;

    const subtotal = (watchedItems ?? []).reduce((sum, item) => {
        const qty = Number(item?.quantity) || 0;
        const rate = Number(item?.rate) || 0;
        return sum + qty * rate;
    }, 0);
    const tax = subtotal * (Number(taxRate) / 100);
    const total = subtotal + tax;

    const onSubmit = (data: InvoiceFormData) => {
        setError("");
        const payload: any = { ...data };
        if (!payload.case) delete payload.case;
        if (!payload.notes) delete payload.notes;

        startTransition(async () => {
            const result = await createInvoiceAction(payload);
            if (result.success) {
                router.push(`/admin/billing/${result.data._id}`);
            } else {
                setError(result.message || "Failed to create invoice");
            }
        });
    };

    const submitAs = (status: "draft" | "sent") => {
        setValue("status", status);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <p className="text-sm text-red-500 border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {errors.client && <span className="mt-1 block text-xs text-red-500">{errors.client.message}</span>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Linked Case <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <select {...register("case")} className={inputClass}>
                        <option value="">— None —</option>
                        {cases.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.title} ({c.caseNumber})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Line Items</label>
                    <button
                        type="button"
                        onClick={() => append({ description: "", quantity: 1, rate: 0 })}
                        className="flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add item
                    </button>
                </div>
                {errors.items?.root && <p className="text-xs text-red-500 mb-2">{errors.items.root.message}</p>}

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="hidden sm:grid grid-cols-[1fr_90px_110px_110px_36px] gap-3 px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        <span>Description</span>
                        <span>Qty</span>
                        <span>Rate</span>
                        <span className="text-right">Amount</span>
                        <span />
                    </div>
                    {fields.map((field, index) => {
                        const qty = Number(watchedItems?.[index]?.quantity) || 0;
                        const rate = Number(watchedItems?.[index]?.rate) || 0;
                        return (
                            <div
                                key={field.id}
                                className="grid grid-cols-1 sm:grid-cols-[1fr_90px_110px_110px_36px] gap-3 px-4 py-3 border-t border-slate-100 items-start"
                            >
                                <div>
                                    <input
                                        {...register(`items.${index}.description`)}
                                        placeholder="Item description"
                                        className={inputClass}
                                    />
                                    {errors.items?.[index]?.description && (
                                        <span className="mt-1 block text-xs text-red-500">
                                            {errors.items[index]?.description?.message}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                    className={inputClass}
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register(`items.${index}.rate`, { valueAsNumber: true })}
                                    className={inputClass}
                                />
                                <div className="flex items-center justify-end h-[42px] text-sm font-medium text-slate-700">
                                    {formatCurrency(qty * rate)}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fields.length > 1 && remove(index)}
                                    disabled={fields.length === 1}
                                    title="Remove item"
                                    className="flex items-center justify-center h-[42px] text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-300 transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                    <input type="date" {...register("dueDate")} className={inputClass} />
                    {errors.dueDate && <span className="mt-1 block text-xs text-red-500">{errors.dueDate.message}</span>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Rate (%)</label>
                    <input type="number" step="0.01" {...register("taxRate", { valueAsNumber: true })} className={inputClass} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea {...register("notes")} rows={2} className={`${inputClass} resize-none`} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 ml-auto max-w-xs">
                <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                    <span>Tax ({Number(taxRate) || 0}%)</span>
                    <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    onClick={() => submitAs("sent")}
                    disabled={isPending}
                    className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    {isPending ? "Saving…" : "Save & Send"}
                </button>
                <button
                    type="submit"
                    onClick={() => submitAs("draft")}
                    disabled={isPending}
                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
                >
                    Save as Draft
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/admin/billing")}
                    className="ml-auto rounded-lg border border-transparent px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-600 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
