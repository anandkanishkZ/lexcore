import type { ReactNode } from "react";

/** Card shell shared by every panel on the profile page, so the section
 * heading, description, and body padding stay identical between the
 * Personal Information and Security tabs instead of each form re-deciding
 * its own spacing (the same reasoning behind FormField and StatusBadge). */
export default function FormPanel({
    title,
    description,
    children,
    footer,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </header>
            <div className="px-6 py-5">{children}</div>
            {footer && <footer className="border-t border-slate-100 px-6 py-4">{footer}</footer>}
        </section>
    );
}

const TONE_CLASSES = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-600",
    info: "border-blue-200 bg-blue-50 text-blue-700",
} as const;

/** Inline result banner. `role="status"` (rather than a bare <p>) so a
 * screen reader announces the save outcome — without it the only signal
 * that anything happened is visual. */
export function FormFeedback({
    tone,
    icon: Icon,
    children,
}: {
    tone: keyof typeof TONE_CLASSES;
    icon?: React.ComponentType<{ className?: string }>;
    children: ReactNode;
}) {
    return (
        <p
            role="status"
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${TONE_CLASSES[tone]}`}
        >
            {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{children}</span>
        </p>
    );
}
