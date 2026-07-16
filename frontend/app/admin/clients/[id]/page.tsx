import { fetchClientAction } from "@/lib/actions/client";
import { fetchInvoicesAction } from "@/lib/actions/invoice";
import { fetchFirmSettingsAction } from "@/lib/actions/settings";
import { redirect } from "next/navigation";
import Link from "next/link";
import { statusTone, statusLabel, displayStatus, formatCurrency } from "../../billing/_components/constants";
import StatusBadge from "../../_components/StatusBadge";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { id } = await params;
    const [result, invoicesResult, settingsResult] = await Promise.all([
        fetchClientAction(id),
        fetchInvoicesAction(1, 100, undefined, id),
        fetchFirmSettingsAction(),
    ]);

    if (!result.success) {
        redirect("/admin/users");
    }

    const currency: string = settingsResult.success ? (settingsResult.data?.currency ?? "USD") : "USD";
    const client = result.data;
    const invoices: any[] = invoicesResult.success ? invoicesResult.data : [];
    const outstanding = invoices
        .filter((inv) => displayStatus(inv.status, inv.dueDate) !== "paid")
        .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);

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
                        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/admin/users"
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

            <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Billing</p>
                        <p className="mt-1 text-sm text-slate-900">
                            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
                            {outstanding > 0 && (
                                <span className="text-red-600 font-medium"> &middot; {formatCurrency(outstanding, currency)} outstanding</span>
                            )}
                        </p>
                    </div>
                    <Link
                        href="/admin/billing/create"
                        className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        New Invoice
                    </Link>
                </div>

                {invoices.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No invoices for this client yet.</p>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {invoices.map((inv) => {
                            const shown = displayStatus(inv.status, inv.dueDate);
                            return (
                                <Link
                                    key={inv._id}
                                    href={`/admin/billing/${inv._id}`}
                                    className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 font-mono">{inv.invoiceNumber}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-slate-700">{formatCurrency(inv.total, currency)}</span>
                                        <StatusBadge tone={statusTone[shown] ?? "neutral"} label={statusLabel[shown] ?? shown} />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
