"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GOLD = "#b8983f";
const GRIDLINE = "#e1e0d9";
const MUTED_TEXT = "#898781";

interface CaseStatusRow {
    status: string;
    count: number;
}

function label(status: string): string {
    return status.replace(/\b\w/g, (c) => c.toUpperCase());
}

function TooltipContent({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as CaseStatusRow;
    return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">{row.count}</p>
            <p className="text-xs text-slate-500">{label(row.status)}</p>
        </div>
    );
}

export default function CasesByStatusChart({ data }: { data: CaseStatusRow[] }) {
    const chartData = data.map((d) => ({ ...d, label: label(d.status) }));

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-900 mb-4">Cases by Status</p>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                            width={28}
                        />
                        <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(184,152,63,0.06)" }} />
                        <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <details className="mt-3">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition">
                    View as table
                </summary>
                <table className="w-full mt-2 text-xs">
                    <thead>
                        <tr className="text-left text-slate-400">
                            <th className="font-medium py-1">Status</th>
                            <th className="font-medium py-1 text-right">Cases</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map((row) => (
                            <tr key={row.status} className="border-t border-slate-100">
                                <td className="py-1.5 text-slate-700">{row.label}</td>
                                <td className="py-1.5 text-right text-slate-700">{row.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
}
