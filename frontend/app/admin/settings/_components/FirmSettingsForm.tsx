"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { firmSettingsSchema, FirmSettingsFormData } from "./schema";
import { updateFirmSettingsAction } from "@/lib/actions/settings";

interface FirmSettingsFormProps {
    defaultValues: FirmSettingsFormData;
}

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white";

export default function FirmSettingsForm({ defaultValues }: FirmSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FirmSettingsFormData>({
        resolver: zodResolver(firmSettingsSchema),
        defaultValues,
    });

    const onSubmit = (data: FirmSettingsFormData) => {
        setError("");
        setSuccess(false);
        startTransition(async () => {
            const result = await updateFirmSettingsAction({
                ...data,
                practiceAreas: data.practiceAreas
                    ? data.practiceAreas.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
            });
            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.message || "Failed to update firm settings");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <p className="text-sm text-red-500 border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
                <p className="text-sm text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
                    Firm settings saved.
                </p>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Firm Name</label>
                <input type="text" {...register("name")} className={inputClass} />
                {errors.name && <span className="mt-1 block text-xs text-red-500">{errors.name.message}</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <input type="email" {...register("email")} className={inputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                    <input type="text" {...register("phone")} className={inputClass} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <input type="text" {...register("address")} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
                    <input type="text" {...register("website")} placeholder="https://…" className={inputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
                    <input type="text" {...register("currency")} placeholder="USD" className={inputClass} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Practice Areas <span className="text-slate-400 font-normal">(comma-separated)</span>
                </label>
                <input
                    type="text"
                    {...register("practiceAreas")}
                    placeholder="Civil, Criminal, Corporate, Family"
                    className={inputClass}
                />
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    {isPending ? "Saving…" : "Save Settings"}
                </button>
            </div>
        </form>
    );
}
