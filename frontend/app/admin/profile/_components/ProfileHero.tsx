"use client";

import Image from "next/image";
import { useRef } from "react";
import { Camera, Mail, X } from "lucide-react";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import type { ProfileUser } from "./types";
import { avatarUrl, fullName, initials, roleLabel, userTypeLabel } from "./types";

interface ProfileHeroProps {
    user: ProfileUser;
    /** Data URL of a photo the user picked but hasn't saved yet. Shown in
     * place of the stored avatar so the hero previews the pending change
     * the Personal Information form is about to submit. */
    previewUrl: string | null;
    onSelectFile: (file: File) => void;
    onClearFile: () => void;
    /** Disables the photo controls while a save is in flight. */
    busy?: boolean;
}

export default function ProfileHero({
    user,
    previewUrl,
    onSelectFile,
    onClearFile,
    busy = false,
}: ProfileHeroProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const stored = avatarUrl(user.profileImage);
    const shown = previewUrl ?? stored;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Brand band — gives the card a masthead the avatar can sit
                against, so the identity block reads as a header rather than
                just another form panel. */}
            <div
                className="h-24"
                style={{ backgroundImage: "linear-gradient(90deg, #0f213d 0%, #1b3358 55%, #b8983f 160%)" }}
            />

            <div className="px-6 pb-6">
                <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-end gap-4">
                        <div className="relative shrink-0">
                            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-sm">
                                {shown ? (
                                    <Image
                                        src={shown}
                                        alt={`${fullName(user)}'s profile photo`}
                                        fill
                                        sizes="96px"
                                        className="object-cover"
                                        // A data: URL from FileReader can't go
                                        // through the image optimizer.
                                        unoptimized={!!previewUrl}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-brand text-2xl font-semibold text-white">
                                        {initials(user)}
                                    </div>
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onSelectFile(file);
                                    // Reset so picking the same file twice in a
                                    // row still fires onChange.
                                    e.target.value = "";
                                }}
                            />

                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => fileInputRef.current?.click()}
                                aria-label="Change profile photo"
                                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-gold text-white shadow-sm transition hover:bg-[#a3853a] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40 disabled:opacity-60"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="pb-1">
                            <h2 className="text-xl font-semibold text-slate-900">{fullName(user)}</h2>
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                                <Mail className="h-3.5 w-3.5" />
                                {user.email}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:pb-1">
                        <StatusBadge
                            label={user.isActive ? "Active" : "Deactivated"}
                            tone={user.isActive ? "success" : "danger"}
                        />
                        <StatusBadge label={roleLabel(user.role)} tone={user.role === "admin" ? "info" : "neutral"} />
                        <StatusBadge label={userTypeLabel(user.userType)} tone="neutral" />
                    </div>
                </div>

                {previewUrl && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-800">
                            New photo selected — save the Personal Information form to apply it.
                        </p>
                        <button
                            type="button"
                            onClick={onClearFile}
                            disabled={busy}
                            className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline-offset-2 hover:underline disabled:opacity-60"
                        >
                            <X className="h-3 w-3" />
                            Discard
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
