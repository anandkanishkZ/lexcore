"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clientSchema, ClientFormData } from "./schema";
import { TextField, TextAreaField, SelectField } from "../../_components/FormField";
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

            <SelectField label="Client Type" error={errors.type?.message} {...register("type")}>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
            </SelectField>

            {clientType === "company" && (
                <TextField label="Company Name" type="text" placeholder="Company name" {...register("companyName")} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                    label="First Name"
                    type="text"
                    placeholder="First name"
                    error={errors.firstName?.message}
                    {...register("firstName")}
                />
                <TextField
                    label="Last Name"
                    type="text"
                    placeholder="Last name"
                    error={errors.lastName?.message}
                    {...register("lastName")}
                />
            </div>

            <TextField
                label="Email"
                type="email"
                placeholder="client@example.com"
                error={errors.email?.message}
                {...register("email")}
            />

            <TextField
                label="Phone"
                type="text"
                placeholder="+977-9800000000"
                error={errors.phone?.message}
                {...register("phone")}
            />

            <TextAreaField label="Address" placeholder="Client address" rows={3} {...register("address")} />

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
