import { AlertCircle, Briefcase, FolderOpen, DollarSign, CheckCircle2 } from "lucide-react";
import { fetchCasesByStatusAction, fetchRevenueByMonthAction, fetchTaskCompletionAction } from "@/lib/actions/report";
import { fetchFirmSettingsAction } from "@/lib/actions/settings";
import StatCard from "../_components/StatCard";
import CasesByStatusChart from "./_components/CasesByStatusChart";
import RevenueByMonthChart from "./_components/RevenueByMonthChart";
import TaskCompletionSection from "./_components/TaskCompletionSection";

export default async function ReportsPage() {
    const [casesResult, revenueResult, tasksResult, settingsResult] = await Promise.all([
        fetchCasesByStatusAction(),
        fetchRevenueByMonthAction(),
        fetchTaskCompletionAction(),
        fetchFirmSettingsAction(),
    ]);
    const currency: string = settingsResult.success ? (settingsResult.data?.currency ?? "USD") : "USD";

    if (!casesResult.success || !revenueResult.success || !tasksResult.success) {
        const message = !casesResult.success
            ? casesResult.message
            : !revenueResult.success
              ? revenueResult.message
              : tasksResult.message;
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load reports</p>
                <p className="text-xs text-slate-500 mt-1">{message}</p>
            </div>
        );
    }

    const casesByStatus: { status: string; count: number }[] = casesResult.data;
    const revenueByMonth: { month: string; total: number }[] = revenueResult.data;
    const taskCompletion: { todo: number; inProgress: number; done: number; completionRate: number } = tasksResult.data;

    const totalCases = casesByStatus.reduce((sum, c) => sum + c.count, 0);
    const openCases = casesByStatus.find((c) => c.status === "open")?.count ?? 0;
    const totalRevenue = revenueByMonth.reduce((sum, r) => sum + r.total, 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900">Reports</h2>
                <p className="mt-1 text-sm text-slate-500">A snapshot of your firm&apos;s cases, revenue, and task progress.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Cases" value={totalCases} icon={Briefcase} />
                <StatCard label="Open Cases" value={openCases} icon={FolderOpen} tone="positive" />
                <StatCard
                    label="Revenue (6mo)"
                    value={new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(
                        totalRevenue
                    )}
                    icon={DollarSign}
                />
                <StatCard label="Task Completion" value={`${Math.round(taskCompletion.completionRate * 100)}%`} icon={CheckCircle2} tone="positive" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CasesByStatusChart data={casesByStatus} />
                <TaskCompletionSection data={taskCompletion} />
            </div>

            <RevenueByMonthChart data={revenueByMonth} currency={currency} />
        </div>
    );
}
