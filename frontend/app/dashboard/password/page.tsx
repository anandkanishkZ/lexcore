import PasswordResetForm from "../_components/PasswordResetForm";
import Link from "next/link";

export default function PasswordPage() {
    return (
        <div className="max-w-md">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Change Password
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Update your account password.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <PasswordResetForm />
            </div>

            <div className="mt-4">
                <Link
                    href="/dashboard/profile"
                    className="text-sm font-medium text-brand hover:underline"
                >
                    Back to profile
                </Link>
            </div>
        </div>
    );
}
