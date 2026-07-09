export const statusStyles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    closed: "bg-slate-100 text-slate-500",
    "on hold": "bg-blue-50 text-blue-600",
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
