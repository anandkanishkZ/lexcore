export const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-500",
    sent: "bg-blue-50 text-blue-600",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-600",
};

export const statusLabel: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
};

export const paymentMethodLabel: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    card: "Card",
    cheque: "Cheque",
    other: "Other",
};

/** Same rule as the backend's derived "overdue" state — never stored,
 * computed at read time from status + dueDate. */
export function displayStatus(status: string, dueDate: string): string {
    if (status === "paid") return "paid";
    if (new Date(dueDate) < new Date()) return "overdue";
    return status;
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
}
