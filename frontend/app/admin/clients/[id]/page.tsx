import { fetchClientAction } from "@/lib/actions/client";
import { redirect } from "next/navigation";
import Link from "next/link";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { id } = await params;
    const result = await fetchClientAction(id);

    if (!result.success) {
        redirect("/admin/clients");
    }

    const client = result.data;

    return (
        <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {client.firstName} {client.lastName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Client details and information.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/admin/clients/${id}/edit`}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-[#1a2540] transition"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/admin/clients"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Back
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            First Name
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.firstName}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Last Name
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.lastName}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Email
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.email}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Phone
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.phone}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Type
                        </p>
                        <p className="mt-1 text-sm text-slate-900 capitalize">
                            {client.type}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Status
                        </p>
                        <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full capitalize ${
                                client.status === "active"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-red-50 text-red-600"
                            }`}
                        >
                            {client.status}
                        </span>
                    </div>
                </div>

                {client.companyName && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Company
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.companyName}
                        </p>
                    </div>
                )}

                {client.address && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Address
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.address}
                        </p>
                    </div>
                )}

                {client.createdBy && (
                    <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                            Created By
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                            {client.createdBy.firstName}{" "}
                            {client.createdBy.lastName}
                        </p>
                    </div>
                )}

                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                        Created At
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                        {new Date(client.createdAt).toLocaleDateString(
                            "en-US",
                            {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            }
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
