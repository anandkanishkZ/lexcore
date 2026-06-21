import { handleUserDetails } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import UpdateForm from "../_components/UpdateForm";
import Link from "next/link";

export default async function ProfilePage() {
    const result = await handleUserDetails();

    if (!result.success) {
        redirect("/login");
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Profile Settings
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Update your personal information and profile photo.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <UpdateForm user={result.data} />
            </div>

            <div className="mt-4">
                <Link
                    href="/dashboard/password"
                    className="text-sm font-medium text-brand hover:underline"
                >
                    Change password
                </Link>
            </div>
        </div>
    );
}
