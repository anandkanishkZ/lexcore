"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GOLD = "#b8983f";
const GRIDLINE = "#e1e0d9";
const MUTED_TEXT = "#898781";

interface RevenueRow {
    month: string;
    total: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(month: string): string {
    const [year, m] = month.split("-");
    return `${MONTH_NAMES[Number(m) - 1]} ${year}`;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function TooltipContent({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as RevenueRow;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(row.total)}</p>
            <p className="text-xs text-slate-500">{label(row.month)}</p>
        </div>
    );
}

export default function RevenueByMonthChart({ data }: { data: RevenueRow[] }) {
    const chartData = data.map((d) => ({ ...d, label: label(d.month) }));
    const total = data.reduce((sum, d) => sum + d.total, 0);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-900">Revenue by Month</p>
                <p className="text-xs text-slate-400">{formatCurrency(total)} total</p>
            </div>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={GOLD} stopOpacity={0.1} />
                                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke={GRIDLINE} vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: MUTED_TEXT, fontSize: 12 }}
                            axisLine={{ stroke: GRIDLINE }}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fill: MUTED_TEXT, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            width={48}
                            tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip content={<TooltipContent />} cursor={{ stroke: GRIDLINE }} />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke={GOLD}
                            strokeWidth={2}
                            fill="url(#revenueFill)"
                            dot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
                            activeDot={{ r: 4, fill: GOLD, stroke: "#fff", strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <details className="mt-3">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition">
                    View as table
                </summary>
                <table className="w-full mt-2 text-xs">
                    <thead>
                        <tr className="text-left text-slate-400">
                            <th className="font-medium py-1">Month</th>
                            <th className="font-medium py-1 text-right">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((row) => (
                            <tr key={row.month} className="border-t border-slate-100">
                                <td className="py-1.5 text-slate-700">{row.label}</td>
                                <td className="py-1.5 text-right text-slate-700">{formatCurrency(row.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
}
