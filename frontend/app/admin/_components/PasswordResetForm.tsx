"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import {
    updatePasswordSchema,
    UpdatePasswordFormData,
} from "@/app/admin/_components/profileSchema";
import { handleUpdatePassword } from "@/lib/actions/auth";

export default function PasswordResetForm() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UpdatePasswordFormData>({
        resolver: zodResolver(updatePasswordSchema),
    });

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
                    setSuccess("Password updated successfully");
                    reset();
                } else {
                    setError(result.message || "Failed to update password");
                }
            } catch (err: any) {
                setError(err?.message || "Failed to update password");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <p className="text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}
            {success && (
                <p className="text-sm text-green-600 text-center border border-green-200 bg-green-50 rounded-lg px-3 py-2">
                    {success}
                </p>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Current Password
                </label>
                <input
                    type="password"
                    {...register("currentPassword")}
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                {errors.currentPassword && (
                    <span className="mt-1 block text-xs text-red-500">
                        {errors.currentPassword.message}
                    </span>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    New Password
                </label>
                <input
                    type="password"
                    {...register("newPassword")}
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                {errors.newPassword && (
                    <span className="mt-1 block text-xs text-red-500">
                        {errors.newPassword.message}
                    </span>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm New Password
                </label>
                <input
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                {errors.confirmPassword && (
                    <span className="mt-1 block text-xs text-red-500">
                        {errors.confirmPassword.message}
                    </span>
                )}
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
            >
                {isPending ? "Updating..." : "Change Password"}
            </button>
        </form>
    );
}
