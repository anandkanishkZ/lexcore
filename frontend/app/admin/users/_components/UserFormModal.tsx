"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { createUserSchema, editUserSchema, type CreateUserFormData, type EditUserFormData } from "./userSchema";
import { createAdminUserAction, updateAdminUserAction } from "@/lib/actions/admin-user";
import { TextField, SelectField } from "../../_components/FormField";

const userTypeOptions = [
    "attorney",
    "lawyer",
    "advocate",
    "paralegal",
    "judge",
    "legal consultant",
    "client",
];

function withOptionalPassword(data: EditUserFormData) {
    const { password, ...rest } = data;
    return password ? { ...rest, password } : rest;
}

interface UserFormModalProps {
    mode: "create" | "edit";
    userId?: string;
    defaultValues?: Partial<CreateUserFormData>;
    onClose: () => void;
    onSuccess: () => void;
}

export default function UserFormModal({ mode, userId, defaultValues, onClose, onSuccess }: UserFormModalProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateUserFormData | EditUserFormData>({
        resolver: zodResolver(mode === "create" ? createUserSchema : editUserSchema),
        defaultValues: {
            userType: "attorney",
            role: "user",
            ...defaultValues,
        },
    });

    const onSubmit = (data: CreateUserFormData | EditUserFormData) => {
        setError("");
        startTransition(async () => {
            const result =
                mode === "create"
                    ? await createAdminUserAction(data as CreateUserFormData)
                    : await updateAdminUserAction(userId!, withOptionalPassword(data as EditUserFormData));

            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || `Failed to ${mode} user`);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="text-sm font-semibold text-slate-900">
                        {mode === "create" ? "Add User" : "Edit User"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
                    {error && (
                        <p className="text-sm text-red-500 text-center border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <TextField label="First Name" type="text" error={errors.firstName?.message} {...register("firstName")} />
                        <TextField label="Last Name" type="text" error={errors.lastName?.message} {...register("lastName")} />
                    </div>

                    <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />

                    <div className="grid grid-cols-2 gap-3">
                        <SelectField label="User Type" className="capitalize" {...register("userType")}>
                            {userTypeOptions.map((t) => (
                                <option key={t} value={t} className="capitalize">
                                    {t}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField label="Role" {...register("role")}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </SelectField>
                    </div>

                    <TextField
                        label={
                            <>
                                Password {mode === "edit" && <span className="text-slate-400">(leave blank to keep current)</span>}
                            </>
                        }
                        type="password"
                        placeholder={mode === "edit" ? "••••••••" : ""}
                        error={errors.password?.message}
                        {...register("password")}
                    />

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                        >
                            {isPending ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
