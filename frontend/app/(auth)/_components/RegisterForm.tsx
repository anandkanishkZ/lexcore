"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RegisterFormData, registerSchema } from "@/app/(auth)/_components/schema";
import { handleRegisterUser } from "@/lib/actions/auth";

export default function RegisterForm() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = (data: RegisterFormData) => {
        setError("");
        startTransition(async () => {
            try {
                const { confirmPassword, ...payload } = data;
                const result = await handleRegisterUser(payload);
                if (result.success) {
                    router.push("/login");
                } else {
                    setError(result.message || "Registration failed");
                }
            } catch (err: any) {
                setError(err?.message || "Registration failed");
            }
        });
    };

    return (
        <div className="w-full max-w-sm">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">Create your account</h2>
                <p className="mt-0.5 text-sm text-slate-500">Get started with Lexcore — it&apos;s free.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    {error && (
                        <p className="text-xs text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">First name</label>
                            <input
                                type="text"
                                {...register("firstName")}
                                placeholder="Anand"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                            />
                            {errors.firstName && (
                                <span className="mt-0.5 block text-xs text-red-500">{errors.firstName.message}</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Last name</label>
                            <input
                                type="text"
                                {...register("lastName")}
                                placeholder="Sharma"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                            />
                            {errors.lastName && (
                                <span className="mt-0.5 block text-xs text-red-500">{errors.lastName.message}</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            {...register("email")}
                            placeholder="anand@lexcore.com"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                        />
                        {errors.email && (
                            <span className="mt-0.5 block text-xs text-red-500">{errors.email.message}</span>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">I am a</label>
                        <select
                            {...register("userType")}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition bg-white"
                        >
                            <option value="">Select your role</option>
                            <option value="client">Client</option>
                            <option value="attorney">Attorney</option>
                            <option value="lawyer">Lawyer</option>
                            <option value="advocate">Advocate</option>
                            <option value="paralegal">Paralegal</option>
                            <option value="judge">Judge</option>
                            <option value="legal consultant">Legal Consultant</option>
                        </select>
                        {errors.userType && (
                            <span className="mt-0.5 block text-xs text-red-500">{errors.userType.message}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                {...register("password")}
                                placeholder="••••••••"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                            />
                            {errors.password && (
                                <span className="mt-0.5 block text-xs text-red-500">{errors.password.message}</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Confirm password</label>
                            <input
                                type="password"
                                {...register("confirmPassword")}
                                placeholder="••••••••"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                            />
                            {errors.confirmPassword && (
                                <span className="mt-0.5 block text-xs text-red-500">{errors.confirmPassword.message}</span>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || isPending}
                        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a2540] active:scale-[0.98] transition disabled:opacity-60"
                    >
                        {isPending ? "Creating account..." : "Create account"}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-slate-800 font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
