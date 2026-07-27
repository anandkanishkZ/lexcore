"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useState, useTransition, type InputHTMLAttributes } from "react";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, X } from "lucide-react";
import { updatePasswordSchema, UpdatePasswordFormData } from "@/app/admin/_components/profileSchema";
import { fieldClass } from "@/app/admin/_components/FormField";
import { handleUpdatePassword } from "@/lib/actions/auth";
import FormPanel, { FormFeedback } from "./FormPanel";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
}

/** TextField can't host a trailing button, and a password box without a
 * reveal toggle makes typo-driven lockouts far likelier — so this wraps the
 * same `fieldClass` input rather than restyling one from scratch. */
const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
    { label, error, hint, id, name, ...rest },
    ref
) {
    const [visible, setVisible] = useState(false);
    const fieldId = id ?? name;

    return (
        <div>
            <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="relative">
                <input
                    ref={ref}
                    id={fieldId}
                    name={name}
                    type={visible ? "text" : "password"}
                    className={`${fieldClass} pr-11`}
                    {...rest}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600 focus:outline-none focus-visible:text-brand-gold"
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
            {error ? (
                <span className="mt-1 block text-xs text-red-500">{error}</span>
            ) : hint ? (
                <span className="mt-1 block text-xs text-slate-400">{hint}</span>
            ) : null}
        </div>
    );
});

/** Mirrors the rules in updatePasswordSchema (and the backend's
 * PasswordSchema). Kept beside the form so the user sees what's still
 * missing while typing instead of only after a failed submit. */
const RULES: { label: string; test: (value: string) => boolean }[] = [
    { label: "At least 8 characters", test: (v) => v.length >= 8 },
    { label: "Contains a letter", test: (v) => /[A-Za-z]/.test(v) },
    { label: "Contains a number", test: (v) => /[0-9]/.test(v) },
];

export default function SecurityForm() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<UpdatePasswordFormData>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const newPassword = watch("newPassword") ?? "";

    const onSubmit = (data: UpdatePasswordFormData) => {
        setError("");
        setSuccess("");

        startTransition(async () => {
            try {
                const result = await handleUpdatePassword({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                });
                if (result.success) {
                    setSuccess("Your password has been changed.");
                    reset();
                } else {
                    setError(result.message || "We couldn't change your password.");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "We couldn't change your password.");
            }
        });
    };

    return (
        <FormPanel
            title="Password"
            description="Choose a strong password you don't reuse anywhere else. You'll stay signed in on this device after changing it."
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                    <FormFeedback tone="error" icon={AlertCircle}>
                        {error}
                    </FormFeedback>
                )}
                {success && (
                    <FormFeedback tone="success" icon={CheckCircle2}>
                        {success}
                    </FormFeedback>
                )}

                <PasswordField
                    label="Current password"
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    error={errors.currentPassword?.message}
                    {...register("currentPassword")}
                />

                <div className="border-t border-slate-100 pt-5">
                    <PasswordField
                        label="New password"
                        autoComplete="new-password"
                        placeholder="Enter a new password"
                        error={errors.newPassword?.message}
                        {...register("newPassword")}
                    />

                    <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                        {RULES.map((rule) => {
                            // Neutral until typing starts — a wall of red X's on
                            // an untouched field reads as failure, not guidance.
                            const untouched = newPassword.length === 0;
                            const passed = rule.test(newPassword);
                            return (
                                <li
                                    key={rule.label}
                                    className={`flex items-center gap-1.5 text-xs ${
                                        untouched
                                            ? "text-slate-400"
                                            : passed
                                              ? "text-emerald-600"
                                              : "text-slate-500"
                                    }`}
                                >
                                    {untouched ? (
                                        <span className="h-3 w-3 shrink-0 rounded-full border border-slate-300" />
                                    ) : passed ? (
                                        <Check className="h-3 w-3 shrink-0" />
                                    ) : (
                                        <X className="h-3 w-3 shrink-0 text-slate-300" />
                                    )}
                                    {rule.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <PasswordField
                    label="Confirm new password"
                    autoComplete="new-password"
                    placeholder="Re-enter the new password"
                    error={errors.confirmPassword?.message}
                    {...register("confirmPassword")}
                />

                <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#a3853a] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isPending ? "Updating…" : "Change password"}
                    </button>
                </div>
            </form>
        </FormPanel>
    );
}
