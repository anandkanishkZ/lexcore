import { CaseModel } from "../models/case.model";
import { PaymentModel } from "../models/payment.model";
import { TaskModel } from "../models/task.model";

const CASE_STATUSES = ["open", "pending", "closed", "on hold"] as const;
const MAX_REVENUE_MONTHS = 24;
const DEFAULT_REVENUE_MONTHS = 6;

export type CasesByStatusResult = { status: string; count: number }[];
export type RevenueByMonthResult = { month: string; total: number }[];
export type TaskCompletionResult = {
    todo: number;
    inProgress: number;
    done: number;
    completionRate: number;
};

export class ReportService {
    async casesByStatus(): Promise<CasesByStatusResult> {
        const grouped = await CaseModel.aggregate<{ _id: string; count: number }>([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        const counts = new Map(grouped.map((g) => [g._id, g.count]));
        // Zero-filled against the known enum so the chart always renders all
        // 4 bars, even for a status with no cases yet.
        return CASE_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
    }

    async revenueByMonth(months: number = DEFAULT_REVENUE_MONTHS): Promise<RevenueByMonthResult> {
        const clampedMonths = Math.min(Math.max(months, 1), MAX_REVENUE_MONTHS);

        const since = new Date();
        since.setDate(1);
        since.setHours(0, 0, 0, 0);
        since.setMonth(since.getMonth() - (clampedMonths - 1));

        // Payment, not Invoice.status — Payment.date/amount is the actual
        // collected-cash ledger; Invoice.paidAmount is only a cache derived
        // from summing these same records (see invoice.repository.ts).
        const grouped = await PaymentModel.aggregate<{ _id: string; total: number }>([
            { $match: { date: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, total: { $sum: "$amount" } } },
        ]);
        const totals = new Map(grouped.map((g) => [g._id, g.total]));

        // Zero-fill every month in the range so the trend line has no gaps.
        const result: RevenueByMonthResult = [];
        const cursor = new Date(since);
        for (let i = 0; i < clampedMonths; i++) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
            result.push({ month: key, total: totals.get(key) ?? 0 });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return result;
    }

    async taskCompletion(): Promise<TaskCompletionResult> {
        const grouped = await TaskModel.aggregate<{ _id: string; count: number }>([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);
        const counts = new Map(grouped.map((g) => [g._id, g.count]));
        const todo = counts.get("todo") ?? 0;
        const inProgress = counts.get("in_progress") ?? 0;
        const done = counts.get("done") ?? 0;
        const total = todo + inProgress + done;

        return { todo, inProgress, done, completionRate: total > 0 ? done / total : 0 };
    }
}
