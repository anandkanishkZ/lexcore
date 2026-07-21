import { fetchAdminUserAction } from "@/lib/actions/admin-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import AssignedCasesPanel from "./_components/AssignedCasesPanel";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <div className="mt-1 text-sm text-slate-900">{children}</div>
        </div>
    );
}

export default async function UserDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { tab: tabParam } = await searchParams;
    const tab = tabParam === "cases" ? "cases" : "profile";

    const result = await fetchAdminUserAction(id);
    if (!result.success) {
        redirect("/admin/users");
    }

    const user = result.data;
    const isStaff = user.userType !== "client";

    return (
        <div className={tab === "cases" ? "max-w-5xl" : "max-w-2xl"}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {user.firstName} {user.lastName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 capitalize">{user.userType} &middot; {user.role}</p>
                </div>
                <Link
                    href="/admin/users"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                    Back
                </Link>
            </div>

            {isStaff && (
                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-fit mb-4">
                    <Link
                        href={`/admin/users/${id}`}
                        className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                            tab === "profile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Profile
                    </Link>
                    <Link
                        href={`/admin/users/${id}?tab=cases`}
                        className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                            tab === "cases" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Cases
                    </Link>
                </div>
            )}

            {tab === "cases" && isStaff ? (
                <AssignedCasesPanel userId={id} />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="First Name">{user.firstName}</Field>
                        <Field label="Last Name">{user.lastName}</Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Email">{user.email}</Field>
                        <Field label="Role">
                            <span className="capitalize">{user.userType}</span>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Access Level">
                            <span className="capitalize">{user.role}</span>
                        </Field>
                        <Field label="Status">
                            <span
                                className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                                    user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                                }`}
                            >
                                {user.isActive ? "Active" : "Inactive"}
                            </span>
                        </Field>
                    </div>

                    <Field label="Joined">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </Field>

                    {!isStaff && (
                        <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
                            This is a client login with no linked CRM contact yet, so there are no cases or billing to show. Add
                            them as a client to track cases and invoices.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
