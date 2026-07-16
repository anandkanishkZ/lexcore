import type { StatusTone } from "../../_components/StatusBadge";

export const statusTone: Record<string, StatusTone> = {
    open: "success",
    pending: "warning",
    closed: "neutral",
    "on hold": "info",
};

export const typeLabel: Record<string, string> = {
    criminal: "Criminal",
    civil: "Civil",
    corporate: "Corporate",
    family: "Family",
    immigration: "Immigration",
    "real estate": "Real Estate",
    other: "Other",
};

export const boardStatuses = ["open", "pending", "on hold", "closed"] as const;

export const statusLabel: Record<string, string> = {
    open: "Open",
    pending: "Pending",
    "on hold": "On Hold",
    closed: "Closed",
};
