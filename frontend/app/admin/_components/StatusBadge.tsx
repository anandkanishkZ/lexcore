/** The one place every status pill in the console gets its color from.
 * Before this, each page (cases, invoices, tasks, document requests,
 * clients) hand-picked its own Tailwind shade per status — which drifted:
 * "inactive" was red-500 in one file and "overdue" was red-600 in another,
 * same meaning, different exact color, with nothing keeping them in sync.
 * Every domain still owns its own status→tone mapping (see each feature's
 * constants.ts) since the status vocabularies are genuinely different
 * (open/pending/closed vs. draft/sent/paid/overdue/void vs. todo/in
 * progress/done) — only the five tones themselves, and what each one looks
 * like, are shared. */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-600",
    info: "bg-blue-50 text-blue-600",
    neutral: "bg-slate-100 text-slate-500",
};

interface StatusBadgeProps {
    label: string;
    tone: StatusTone;
    /** For a voided/cancelled-but-kept record — the record still exists but
     * is no longer active, visually distinct from a plain neutral tone. */
    strikethrough?: boolean;
    /** e.g. lucide-react's Clock/FileCheck2/Ban — a small leading icon,
     * for statuses (document requests) where it carries real information
     * at a glance, not just decoration. */
    icon?: React.ComponentType<{ className?: string }>;
    className?: string;
}

export default function StatusBadge({ label, tone, strikethrough, icon: Icon, className = "" }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${TONE_CLASSES[tone]} ${strikethrough ? "line-through" : ""} ${className}`}
        >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </span>
    );
}
