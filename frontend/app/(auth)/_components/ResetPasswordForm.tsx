"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ResetPasswordFormData, resetPasswordSchema } from "@/app/(auth)/_components/schema";
import { handleResetPassword } from "@/lib/actions/auth";

export default function ResetPasswordForm({ token }: { token: string | undefined }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    if (!token) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-sm text-red-600">This reset link is missing its token — please use the link from your email.</p>
                <Link href="/forgot-password" className="mt-4 inline-block text-sm text-brand-gold font-medium hover:underline">
                    Request a new link
                </Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-sm text-slate-700">Your password has been reset.</p>
                <button
                    onClick={() => router.push("/login")}
                    className="mt-4 w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition"
                >
                    Sign in
                </button>
            </div>
        );
    }

    const onSubmit = (data: ResetPasswordFormData) => {
        setError("");
        startTransition(async () => {
            const result = await handleResetPassword(token, data.password);
            if (result.success) {
                setDone(true);
            } else {
                setError(result.message || "This reset link is invalid or has expired");
            }
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error && (
                    <p className="text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                    <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        {...register("password")}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                    {errors.password && <span className="mt-1 block text-xs text-red-500">{errors.password.message}</span>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
                    <input
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        {...register("confirmPassword")}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                    {errors.confirmPassword && (
                        <span className="mt-1 block text-xs text-red-500">{errors.confirmPassword.message}</span>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    {isPending ? "Resetting..." : "Reset password"}
                </button>
            </form>
        </div>
    );
}
