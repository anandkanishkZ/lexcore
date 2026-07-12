"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { statusStyles, statusLabel, displayStatus, formatCurrency } from "./constants";

export interface InvoiceRow {
    _id: string;
    invoiceNumber: string;
    client?: { firstName: string; lastName: string } | null;
    total: number;
    paidAmount: number;
    status: string;
    dueDate: string;
}

export default function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Invoice
                            </th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">
                                Client
                            </th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">
                                Due
                            </th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Total
                            </th>
                            <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">
                                Due Amount
                            </th>
                            <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Status
                            </th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {invoices.map((inv) => {
                            const shownStatus = displayStatus(inv.status, inv.dueDate);
                            const amountDue = inv.total - inv.paidAmount;
                            return (
                                <tr key={inv._id} className="hover:bg-slate-50 transition">
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium text-slate-900 font-mono">{inv.invoiceNumber}</p>
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                                        {inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                                        {new Date(inv.dueDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-slate-900 font-medium">
                                        {formatCurrency(inv.total)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right text-slate-500 hidden lg:table-cell">
                                        {amountDue > 0 ? formatCurrency(amountDue) : "—"}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyles[shownStatus] ?? "bg-slate-100 text-slate-600"}`}
                                        >
                                            {statusLabel[shownStatus] ?? shownStatus}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <Link
                                            href={`/admin/billing/${inv._id}`}
                                            title="View"
                                            className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
