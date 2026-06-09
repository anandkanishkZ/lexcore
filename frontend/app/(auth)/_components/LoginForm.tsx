"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginFormData, loginSchema } from "@/app/(auth)/_components/schema";
import { handleLoginUser } from "@/lib/actions/auth";

export default function LoginForm() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = (data: LoginFormData) => {
        setError("");
        startTransition(async () => {
            try {
                const result = await handleLoginUser(data);
                if (result.success) {
                    router.push("/dashboard");
                } else {
                    setError(result.message || "Login failed");
                }
            } catch (err: any) {
                setError(err?.message || "Login failed");
            }
        });
    };

    return (
        <div className="w-full max-w-sm">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
                <p className="mt-0.5 text-sm text-slate-500">Welcome back — enter your details below.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <p className="text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            {...register("email")}
                            placeholder="you@example.com"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                        />
                        {errors.email && (
                            <span className="mt-1 block text-xs text-red-500">{errors.email.message}</span>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            {...register("password")}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                        />
                        {errors.password && (
                            <span className="mt-1 block text-xs text-red-500">{errors.password.message}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || isPending}
                        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a2540] active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Signing in..." : "Sign in"}
                    </button>

                    <p className="text-center text-sm text-slate-500">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-slate-800 font-medium hover:underline">
                            Sign up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
