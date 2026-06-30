"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition, useRef } from "react";
import {
    updateProfileSchema,
    UpdateProfileFormData,
} from "@/app/admin/_components/profileSchema";
import { handleUpdateProfile } from "@/lib/actions/auth";
import { useAuth } from "@/lib/contexts/AuthContext";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

interface UpdateFormProps {
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        userType: string;
        profileImage: string;
    };
}

export default function UpdateForm({ user }: UpdateFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { setUser } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UpdateProfileFormData>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("Image must be less than 5MB");
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const onSubmit = (data: UpdateProfileFormData) => {
        setError("");
        setSuccess("");

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("firstName", data.firstName);
                formData.append("lastName", data.lastName);
                formData.append("email", data.email);
                if (selectedFile) {
                    formData.append("profileImage", selectedFile);
                }

                const result = await handleUpdateProfile(formData);
                if (result.success) {
                    setSuccess("Profile updated successfully");
                    setUser(result.data);
                    clearImage();
                } else {
                    setError(result.message || "Update failed");
                }
            } catch (err: any) {
                setError(err?.message || "Update failed");
            }
        });
    };

    const currentImage = user.profileImage
        ? `${API_URL}${user.profileImage}`
        : null;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-200 shrink-0">
                    {imagePreview || currentImage ? (
                        <Image
                            src={imagePreview || currentImage!}
                            alt="Profile"
                            fill
                            className="object-cover"
                            unoptimized={!!imagePreview}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-2xl font-semibold">
                            {user.firstName[0]}
                            {user.lastName[0]}
                        </div>
                    )}
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm font-medium text-brand-gold hover:underline"
                    >
                        Change photo
                    </button>
                    {selectedFile && (
                        <button
                            type="button"
                            onClick={clearImage}
                            className="ml-3 text-sm text-red-500 hover:underline"
                        >
                            Remove
                        </button>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                        JPG, PNG or WebP. Max 5MB.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        First Name
                    </label>
                    <input
                        type="text"
                        {...register("firstName")}
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
                    User Type
                </label>
                <input
                    type="text"
                    value={user.userType}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
            </div>

            <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
            >
                {isPending ? "Updating..." : "Update Profile"}
            </button>
        </form>
    );
}
