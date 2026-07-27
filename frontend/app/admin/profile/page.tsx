import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { handleUserDetails } from "@/lib/actions/auth";
import ProfileWorkspace from "./_components/ProfileWorkspace";
import type { ProfileUser } from "./_components/types";

interface PageProps {
    searchParams: Promise<{ tab?: string }>;
}

export default async function ProfilePage({ searchParams }: PageProps) {
    const { tab } = await searchParams;
    const result = await handleUserDetails();

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    if (!result.success || !result.data) {
        return (
            <div className="max-w-2xl">
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div>
                        <h2 className="text-sm font-semibold text-red-700">Couldn&apos;t load your profile</h2>
                        <p className="mt-1 text-sm text-red-600">
                            {result.message || "Something went wrong. Please refresh and try again."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-6">
                <p className="text-sm text-slate-500">
                    Manage the details other people at your firm see, and keep your sign-in secure.
                </p>
            </div>

            <ProfileWorkspace
                user={result.data as ProfileUser}
                initialTab={tab === "security" ? "security" : "personal"}
            />
        </div>
    );
}
