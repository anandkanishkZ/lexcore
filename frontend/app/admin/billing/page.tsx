import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Plus, Receipt } from "lucide-react";
import { fetchInvoicesAction } from "@/lib/actions/invoice";
import InvoicesTable, { type InvoiceRow } from "./_components/InvoicesTable";
import { displayStatus } from "./_components/constants";

interface PageProps {
    searchParams: Promise<{ status?: string }>;
}

const TABS = [
    { value: "", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Sent" },
    { value: "overdue", label: "Overdue" },
    { value: "paid", label: "Paid" },
    { value: "void", label: "Void" },
] as const;

export default async function BillingPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const activeTab = params.status ?? "";

    const result = await fetchInvoicesAction(1, 200);

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    const all: InvoiceRow[] = result.data ?? [];
    const invoices = activeTab
        ? all.filter((inv) => displayStatus(inv.status, inv.dueDate) === activeTab)
        : all;

    const outstanding = all
        .filter((inv) => !["paid", "void"].includes(displayStatus(inv.status, inv.dueDate)))
        .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <p className="text-sm text-slate-500">
                    {all.length} invoice{all.length === 1 ? "" : "s"}
                    {outstanding > 0 && (
                        <span className="text-slate-400">
                            {" "}
                            &middot; {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(outstanding)} outstanding
                        </span>
                    )}
                </p>
                <Link
                    href="/admin/billing/create"
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <Plus className="w-4 h-4" />
                    New Invoice
                </Link>
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-fit mb-4">
                {TABS.map((tab) => (
                    <Link
                        key={tab.value}
                        href={tab.value ? `/admin/billing?status=${tab.value}` : "/admin/billing"}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                            activeTab === tab.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            {!result.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load invoices</p>
                    <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
                </div>
            ) : invoices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                        <Receipt className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No invoices {activeTab ? `in "${activeTab}"` : "yet"}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {activeTab ? "Try a different filter." : "Create your first invoice to get started."}
                    </p>
                </div>
            ) : (
                <InvoicesTable invoices={invoices} />
            )}
        </div>
    );
}
