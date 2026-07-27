"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { updateProfileSchema, UpdateProfileFormData } from "@/app/admin/_components/profileSchema";
import { TextField } from "@/app/admin/_components/FormField";
import { handleUpdateProfile } from "@/lib/actions/auth";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { ProfileUser } from "./types";
import { userTypeLabel } from "./types";
import FormPanel, { FormFeedback } from "./FormPanel";

interface PersonalInfoFormProps {
    user: ProfileUser;
    /** Owned by the workspace so the hero can preview it — this form only
     * submits it and reports back once it's been persisted. */
    pendingPhoto: File | null;
    onPhotoSaved: () => void;
    onBusyChange: (busy: boolean) => void;
}

export default function PersonalInfoForm({
    user,
    pendingPhoto,
    onPhotoSaved,
    onBusyChange,
}: PersonalInfoFormProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const { setUser } = useAuth();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<UpdateProfileFormData>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        },
    });

    // A pending photo is a real unsaved change even when no text field was
    // touched, so the save button has to consider both.
    const hasChanges = isDirty || !!pendingPhoto;

    const onSubmit = (data: UpdateProfileFormData) => {
        setError("");
        setSuccess("");
        onBusyChange(true);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("firstName", data.firstName);
                formData.append("lastName", data.lastName);
                formData.append("email", data.email);
                if (pendingPhoto) formData.append("profileImage", pendingPhoto);

                const result = await handleUpdateProfile(formData);
                if (result.success) {
                    setSuccess("Your profile has been updated.");
                    setUser(result.data);
                    onPhotoSaved();
                    // Re-baseline the form so isDirty goes back to false and
                    // the save button correctly disables again.
                    reset({
                        firstName: result.data.firstName,
                        lastName: result.data.lastName,
                        email: result.data.email,
                    });
                } else {
                    setError(result.message || "We couldn't update your profile.");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "We couldn't update your profile.");
            } finally {
                onBusyChange(false);
            }
        });
    };

    return (
        <FormPanel
            title="Personal Information"
            description="Your name and email as they appear across Lexcore and on documents you generate."
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                        label="First name"
                        type="text"
                        autoComplete="given-name"
                        error={errors.firstName?.message}
                        {...register("firstName")}
                    />
                    <TextField
                        label="Last name"
                        type="text"
                        autoComplete="family-name"
                        error={errors.lastName?.message}
                        {...register("lastName")}
                    />
                </div>

                <TextField
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    hint="Used for sign-in and system notifications."
                    error={errors.email?.message}
                    {...register("email")}
                />

                <TextField
                    label="Professional title"
                    type="text"
                    value={userTypeLabel(user.userType)}
                    readOnly
                    disabled
                    hint="Set by your firm administrator — contact them to change it."
                />

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                    {hasChanges && !isPending && (
                        <span className="text-xs text-slate-400">You have unsaved changes</span>
                    )}
                    <button
                        type="submit"
                        disabled={isPending || !hasChanges}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#a3853a] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isPending ? "Saving…" : "Save changes"}
                    </button>
                </div>
            </form>
        </FormPanel>
    );
}
