"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { firmSettingsSchema, FirmSettingsFormData } from "./schema";
import { updateFirmSettingsAction } from "@/lib/actions/settings";
import { TextField, SelectField } from "../../_components/FormField";

interface FirmSettingsFormProps {
    defaultValues: FirmSettingsFormData;
    esewaSecretConfigured: boolean;
}

export default function FirmSettingsForm({ defaultValues, esewaSecretConfigured }: FirmSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [secretConfigured, setSecretConfigured] = useState(esewaSecretConfigured);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FirmSettingsFormData>({
        resolver: zodResolver(firmSettingsSchema),
        defaultValues,
    });

    const esewaEnabled = watch("esewaEnabled");

    // The "saved" banner should only ever describe the form's current
    // values, not a stale save from before the user changed something —
    // without this it kept saying "Firm settings saved" indefinitely, even
    // after editing a field with no further save.
    useEffect(() => {
        const subscription = watch(() => setSuccess(false));
        return () => subscription.unsubscribe();
    }, [watch]);

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
                if (data.esewaSecret) setSecretConfigured(true);
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

            <TextField label="Firm Name" type="text" error={errors.name?.message} {...register("name")} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Email" type="email" {...register("email")} />
                <TextField label="Phone" type="text" {...register("phone")} />
            </div>

            <TextField label="Address" type="text" {...register("address")} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label="Website" type="text" placeholder="https://…" {...register("website")} />
                <TextField label="Currency" type="text" placeholder="USD" {...register("currency")} />
            </div>

            <TextField
                label={
                    <>
                        Practice Areas <span className="text-slate-400 font-normal">(comma-separated)</span>
                    </>
                }
                type="text"
                placeholder="Civil, Criminal, Corporate, Family"
                {...register("practiceAreas")}
            />

            <div className="pt-4 mt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold text-slate-900">Payment Gateway — eSewa</h2>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" {...register("esewaEnabled")} className="h-4 w-4 rounded border-slate-300 text-brand-gold focus:ring-brand-gold/20" />
                        Enabled
                    </label>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                    Lets clients pay an invoice from the mobile app. Disabled until credentials are saved here.
                </p>

                <div className={`space-y-4 ${esewaEnabled ? "" : "opacity-50"}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField label="Environment" disabled={!esewaEnabled} {...register("esewaEnvironment")}>
                            <option value="test">Test</option>
                            <option value="live">Live</option>
                        </SelectField>
                        <TextField label="Client ID" type="text" disabled={!esewaEnabled} {...register("esewaClientId")} />
                    </div>
                    <TextField
                        label={
                            <>
                                Secret Key{" "}
                                {secretConfigured && (
                                    <span className="ml-1 text-xs font-normal text-emerald-600">— a secret is already saved</span>
                                )}
                            </>
                        }
                        type="password"
                        disabled={!esewaEnabled}
                        placeholder={secretConfigured ? "Leave blank to keep the saved secret" : "Enter the eSewa secret key"}
                        autoComplete="new-password"
                        {...register("esewaSecret")}
                    />
                </div>
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
