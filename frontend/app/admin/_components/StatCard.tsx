import { type LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tone?: "default" | "positive" | "warning";
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
    default: "bg-slate-100 text-slate-600",
    positive: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
};

export default function StatCard({ label, value, icon: Icon, tone = "default" }: StatCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneStyles[tone]}`}>
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
            </div>
        </div>
    );
}
