"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clientSchema, ClientFormData } from "./schema";
import {
    createClientAction,
    updateClientAction,
} from "@/lib/actions/client";

interface ClientFormProps {
    mode: "create" | "edit";
    clientId?: string;
    defaultValues?: Partial<ClientFormData>;
}

export default function ClientForm({
    mode,
    clientId,
    defaultValues,
}: ClientFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ClientFormData>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            type: "individual",
            ...defaultValues,
        },
    });

    const clientType = watch("type");

    const onSubmit = (data: ClientFormData) => {
        setError("");
        startTransition(async () => {
            try {
                const result =
                    mode === "create"
                        ? await createClientAction(data)
                        : await updateClientAction(clientId!, data);

                if (result.success) {
                    router.push("/admin/users");
                } else {
                    setError(result.message || `Failed to ${mode} client`);
                }
            } catch (err: any) {
                setError(err?.message || `Failed to ${mode} client`);
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

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Client Type
                </label>
                <select
                    {...register("type")}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                >
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                </select>
                {errors.type && (
                    <span className="mt-1 block text-xs text-red-500">
                        {errors.type.message}
                    </span>
                )}
            </div>

            {clientType === "company" && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Company Name
                    </label>
                    <input
                        type="text"
                        {...register("companyName")}
                        placeholder="Company name"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        First Name
                    </label>
                    <input
                        type="text"
                        {...register("firstName")}
                        placeholder="First name"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                    {errors.firstName && (
                        <span className="mt-1 block text-xs text-red-500">
                            {errors.firstName.message}
                        </span>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Last Name
                    </label>
                    <input
                        type="text"
                        {...register("lastName")}
                        placeholder="Last name"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                    />
                    {errors.lastName && (
                        <span className="mt-1 block text-xs text-red-500">
                            {errors.lastName.message}
                        </span>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                </label>
                <input
                    type="email"
                    {...register("email")}
                    placeholder="client@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                {errors.email && (
                    <span className="mt-1 block text-xs text-red-500">
                        {errors.email.message}
                    </span>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone
                </label>
                <input
                    type="text"
                    {...register("phone")}
                    placeholder="+977-9800000000"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                {errors.phone && (
                    <span className="mt-1 block text-xs text-red-500">
                        {errors.phone.message}
                    </span>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address
                </label>
                <textarea
                    {...register("address")}
                    placeholder="Client address"
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition resize-none"
                />
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                >
                    {isPending
                        ? mode === "create"
                            ? "Creating..."
                            : "Updating..."
                        : mode === "create"
                          ? "Create Client"
                          : "Update Client"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/admin/users")}
                    className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
