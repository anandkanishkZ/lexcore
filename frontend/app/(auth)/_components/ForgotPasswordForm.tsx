"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ForgotPasswordFormData, forgotPasswordSchema } from "@/app/(auth)/_components/schema";
import { handleForgotPassword } from "@/lib/actions/auth";

export default function ForgotPasswordForm() {
    const [isPending, startTransition] = useTransition();
    const [sent, setSent] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = (data: ForgotPasswordFormData) => {
        startTransition(async () => {
            // Always shows the same "check your email" state regardless of
            // the backend's response — it deliberately never reveals whether
            // an email is registered (see UserService.forgotPassword).
            await handleForgotPassword(data.email);
            setSent(true);
        });
    };

    if (sent) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-sm text-slate-700">
                    If that email is registered, we&apos;ve sent a link to reset your password. It expires in 1 hour.
                </p>
                <Link href="/login" className="mt-4 inline-block text-sm text-brand-gold font-medium hover:underline">
                    ← Back to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...register("email")}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                    {errors.email && <span className="mt-1 block text-xs text-red-500">{errors.email.message}</span>}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    {isPending ? "Sending..." : "Send reset link"}
                </button>
            </form>

            <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800 transition">
                    ← Back to sign in
                </Link>
            </div>
        </div>
    );
}
