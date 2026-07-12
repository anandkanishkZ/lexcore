"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { recordPaymentAction } from "@/lib/actions/invoice";
import { paymentMethodLabel } from "../../_components/constants";

const paymentSchema = z.object({
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    method: z.enum(["cash", "bank_transfer", "card", "cheque", "other"]),
    date: z.string().optional(),
    notes: z.string().optional(),
});
type PaymentFormData = z.infer<typeof paymentSchema>;

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white";

export default function RecordPaymentModal({
    invoiceId,
    amountDue,
    onClose,
    onSuccess,
}: {
    invoiceId: string;
    amountDue: number;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<PaymentFormData>({
        resolver: zodResolver(paymentSchema),
        defaultValues: { method: "cash", amount: amountDue > 0 ? Math.round(amountDue * 100) / 100 : undefined },
    });

    const onSubmit = (data: PaymentFormData) => {
        setError("");
        const payload: any = { ...data };
        if (!payload.date) delete payload.date;
        if (!payload.notes) delete payload.notes;

        startTransition(async () => {
            const result = await recordPaymentAction(invoiceId, payload);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Failed to record payment");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">Record Payment</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <p className="text-sm text-red-500 border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                        <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className={inputClass} />
                        {errors.amount && <span className="mt-1 block text-xs text-red-500">{errors.amount.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Method</label>
                        <select {...register("method")} className={inputClass}>
                            {Object.entries(paymentMethodLabel).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Date <span className="text-slate-400 font-normal">(optional, defaults to today)</span>
                        </label>
                        <input type="date" {...register("date")} className={inputClass} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Notes <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea {...register("notes")} rows={2} className={`${inputClass} resize-none`} />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                        >
                            {isPending ? "Recording…" : "Record Payment"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
