"use client";

import { useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import ProfileHero from "./ProfileHero";
import PersonalInfoForm from "./PersonalInfoForm";
import SecurityForm from "./SecurityForm";
import AccountDetails from "./AccountDetails";
import type { ProfileUser } from "./types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const TABS = [
    { id: "personal", label: "Personal Information", icon: UserRound },
    { id: "security", label: "Security", icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Owns the two pieces of state both halves of the page need: the pending
 * avatar (picked in the hero, submitted by the Personal Information form)
 * and the active tab. Everything below it stays presentational. */
export default function ProfileWorkspace({
    user,
    initialTab,
}: {
    user: ProfileUser;
    initialTab: TabId;
}) {
    const [tab, setTab] = useState<TabId>(initialTab);
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState("");
    const [busy, setBusy] = useState(false);

    // Read the file here in the event handler rather than in an effect keyed
    // on `photo` — the effect version had to setState on every change just to
    // keep the preview in sync, which is exactly the cascading-render pattern
    // the compiler flags. FileReader gives back an in-memory data: URL, so
    // unlike createObjectURL there's nothing to revoke on clear.
    const selectPhoto = (file: File) => {
        if (file.size > MAX_PHOTO_BYTES) {
            setPhotoError("That image is larger than 5MB. Please choose a smaller one.");
            return;
        }
        setPhotoError("");
        setPhoto(file);
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const clearPhoto = () => {
        setPhotoError("");
        setPhoto(null);
        setPhotoPreview(null);
    };

    const switchTab = (next: TabId) => {
        setTab(next);
        // Keep the URL in step so a refresh (or a shared link) reopens the
        // same tab, without the server round-trip a router.replace would
        // cost on a purely client-side toggle.
        const url = next === "personal" ? "/admin/profile" : `/admin/profile?tab=${next}`;
        window.history.replaceState(null, "", url);
    };

    return (
        <div className="space-y-6">
            <ProfileHero
                user={user}
                previewUrl={photoPreview}
                onSelectFile={selectPhoto}
                onClearFile={clearPhoto}
                busy={busy}
            />

            {photoError && (
                <p role="status" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {photoError}
                </p>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div
                        role="tablist"
                        aria-label="Profile sections"
                        className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                    >
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const active = tab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => switchTab(id)}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40 ${
                                        active
                                            ? "bg-brand text-white shadow-sm"
                                            : "text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {tab === "personal" ? (
                        <PersonalInfoForm
                            user={user}
                            pendingPhoto={photo}
                            onPhotoSaved={clearPhoto}
                            onBusyChange={setBusy}
                        />
                    ) : (
                        <SecurityForm />
                    )}
                </div>

                <aside className="lg:col-span-1">
                    <AccountDetails user={user} />
                </aside>
            </div>
        </div>
    );
}
