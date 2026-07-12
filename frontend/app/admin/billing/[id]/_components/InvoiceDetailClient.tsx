"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Printer, CreditCard, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { deleteInvoiceAction } from "@/lib/actions/invoice";
import RecordPaymentModal from "./RecordPaymentModal";
import { statusStyles, statusLabel, displayStatus, paymentMethodLabel, formatCurrency } from "../../_components/constants";

interface InvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}

interface InvoiceDetail {
    _id: string;
    invoiceNumber: string;
    client: { firstName: string; lastName: string; email: string; phone?: string; address?: string };
    case?: { title: string; caseNumber: string } | null;
    items: InvoiceItem[];
    taxRate: number;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    status: string;
    dueDate: string;
    notes?: string;
    createdAt: string;
}

interface PaymentRow {
    _id: string;
    amount: number;
    method: string;
    date: string;
    receiptNumber: string;
    notes?: string;
}

interface FirmSettings {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

export default function InvoiceDetailClient({
    invoice,
    payments,
    firm,
}: {
    invoice: InvoiceDetail;
    payments: PaymentRow[];
    firm: FirmSettings;
}) {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const shownStatus = displayStatus(invoice.status, invoice.dueDate);
    const amountDue = Math.max(0, invoice.total - invoice.paidAmount);

    const handleDelete = async () => {
        if (!confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
        setDeleting(true);
        const result = await deleteInvoiceAction(invoice._id);
        if (result.success) {
            router.push("/admin/billing");
        } else {
            setDeleting(false);
            alert(result.message || "Failed to delete invoice");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Link href="/admin/billing" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="w-4 h-4" />
                    Back to invoices
                </Link>
                <div className="flex items-center gap-2">
                    {invoice.status !== "paid" && (
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                        >
                            <CreditCard className="w-4 h-4" />
                            Record Payment
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            title="Delete invoice"
                            className="p-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 print:border-0 print:shadow-none print:p-0">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Invoice</p>
                        <h1 className="text-2xl font-semibold text-slate-900 font-mono mt-1">{invoice.invoiceNumber}</h1>
                        <span
                            className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[shownStatus] ?? "bg-slate-100 text-slate-600"}`}
                        >
                            {statusLabel[shownStatus] ?? shownStatus}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-base font-semibold text-slate-900">{firm.name}</p>
                        {firm.address && <p className="text-xs text-slate-500 mt-1 max-w-[220px]">{firm.address}</p>}
                        {firm.email && <p className="text-xs text-slate-500">{firm.email}</p>}
                        {firm.phone && <p className="text-xs text-slate-500">{firm.phone}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-slate-100">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Bill To</p>
                        <p className="text-sm font-medium text-slate-900">
                            {invoice.client.firstName} {invoice.client.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{invoice.client.email}</p>
                        {invoice.client.phone && <p className="text-sm text-slate-500">{invoice.client.phone}</p>}
                        {invoice.case && (
                            <p className="text-xs text-slate-400 mt-2 font-mono">
                                Case: {invoice.case.title} ({invoice.case.caseNumber})
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Due Date</p>
                        <p className="text-sm font-medium text-slate-900">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3 mb-1.5">Issued</p>
                        <p className="text-sm text-slate-500">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <table className="w-full text-sm mb-6">
                    <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            <th className="text-left pb-2">Description</th>
                            <th className="text-right pb-2 w-20">Qty</th>
                            <th className="text-right pb-2 w-28">Rate</th>
                            <th className="text-right pb-2 w-28">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {invoice.items.map((item, i) => (
                            <tr key={i}>
                                <td className="py-2.5 text-slate-700">{item.description}</td>
                                <td className="py-2.5 text-right text-slate-500">{item.quantity}</td>
                                <td className="py-2.5 text-right text-slate-500">{formatCurrency(item.rate)}</td>
                                <td className="py-2.5 text-right text-slate-900 font-medium">{formatCurrency(item.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-8">
                    <div className="w-64 space-y-1.5">
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Subtotal</span>
                            <span>{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Tax ({invoice.taxRate}%)</span>
                            <span>{formatCurrency(invoice.tax)}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold text-slate-900 pt-1.5 border-t border-slate-200">
                            <span>Total</span>
                            <span>{formatCurrency(invoice.total)}</span>
                        </div>
                        {invoice.paidAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                                <span>Paid</span>
                                <span>-{formatCurrency(invoice.paidAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-semibold text-slate-900">
                            <span>Amount Due</span>
                            <span>{formatCurrency(amountDue)}</span>
                        </div>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="mb-8 pt-4 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notes</p>
                        <p className="text-sm text-slate-600">{invoice.notes}</p>
                    </div>
                )}

                {payments.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 print:hidden">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Payment History</p>
                        <div className="space-y-2">
                            {payments.map((p) => (
                                <div key={p._id} className="flex items-center justify-between text-sm py-1.5">
                                    <div>
                                        <span className="text-slate-700 font-medium">{formatCurrency(p.amount)}</span>
                                        <span className="text-slate-400"> via {paymentMethodLabel[p.method] ?? p.method}</span>
                                        <span className="text-slate-300 font-mono text-xs ml-2">{p.receiptNumber}</span>
                                    </div>
                                    <span className="text-slate-400 text-xs">{new Date(p.date).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showPaymentModal && (
                <RecordPaymentModal
                    invoiceId={invoice._id}
                    amountDue={amountDue}
                    onClose={() => setShowPaymentModal(false)}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
