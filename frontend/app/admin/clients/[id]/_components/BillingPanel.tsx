import Link from "next/link";
import { fetchInvoicesAction } from "@/lib/actions/invoice";
import { fetchFirmSettingsAction } from "@/lib/actions/settings";
import { statusTone, statusLabel, displayStatus, formatCurrency } from "../../../billing/_components/constants";
import StatusBadge from "../../../_components/StatusBadge";

export default async function BillingPanel({ clientId }: { clientId: string }) {
    const [invoicesResult, settingsResult] = await Promise.all([
        fetchInvoicesAction(1, 100, undefined, clientId),
        fetchFirmSettingsAction(),
    ]);

    const currency: string = settingsResult.success ? (settingsResult.data?.currency ?? "USD") : "USD";
    const invoices: any[] = invoicesResult.success ? invoicesResult.data : [];
    const outstanding = invoices
        .filter((inv) => displayStatus(inv.status, inv.dueDate) !== "paid")
        .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
    );
}
