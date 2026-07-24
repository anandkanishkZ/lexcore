import type { StatusTone } from "../../_components/StatusBadge";

export const statusTone: Record<string, StatusTone> = {
    draft: "neutral",
    sent: "info",
    paid: "success",
    overdue: "danger",
    void: "neutral",
};

/** Only "void" needs this — a voided invoice is visually struck through on
 * top of its neutral tone, distinct from a plain draft. */
export const statusStrikethrough: Record<string, boolean> = {
    void: true,
};

export const statusLabel: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    void: "Void",
};

export const paymentMethodLabel: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    card: "Card",
    cheque: "Cheque",
    esewa: "eSewa",
    khalti: "Khalti",
    other: "Other",
};

/** Same rule as the backend's derived "overdue" state — never stored,
 * computed at read time from status + dueDate. */
export function displayStatus(status: string, dueDate: string): string {
    if (status === "paid" || status === "void") return status;
    if (new Date(dueDate) < new Date()) return "overdue";
    return status;
}

/** [currency] should be the firm's configured ISO 4217 code (Firm Settings
 * → Currency — see fetchFirmSettingsAction), not hardcoded — a firm billing
 * in NPR or EUR should never see "$" on their own invoices. Falls back to
 * a plain "CODE amount" format if the configured value isn't a currency
 * Intl recognizes (it's a free-text field, so a typo shouldn't crash the
 * page — just render less prettily). */
export function formatCurrency(amount: number, currency = "USD"): string {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}
