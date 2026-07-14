// Todo → In Progress → Done is an ordinal workflow progression (the order
// carries meaning), so this uses one hue at increasing "completion"
// lightness rather than three unrelated categorical colors.
const TODO_TINT = "#e8dcc0";
const IN_PROGRESS_TINT = "#b8983f";
const DONE_TINT = "#8a6f28";

interface TaskCompletionData {
    todo: number;
    inProgress: number;
    done: number;
    completionRate: number;
}

export default function TaskCompletionSection({ data }: { data: TaskCompletionData }) {
    const total = data.todo + data.inProgress + data.done;
    const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
    const ratePct = Math.round(data.completionRate * 100);

    const segments = [
        { label: "Todo", value: data.todo, color: TODO_TINT },
        { label: "In Progress", value: data.inProgress, color: IN_PROGRESS_TINT },
        { label: "Done", value: data.done, color: DONE_TINT },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-900 mb-4">Task Completion</p>

            {total === 0 ? (
                <p className="text-sm text-slate-400 py-4">No tasks yet.</p>
            ) : (
                <>
                    <div className="flex h-4 rounded-full overflow-hidden">
                        {segments.map(
                            (s) =>
                                s.value > 0 && (
                                    <div
                                        key={s.label}
                                        style={{ width: `${pct(s.value)}%`, backgroundColor: s.color }}
                                        title={`${s.label}: ${s.value}`}
                                    />
                                )
                        )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {segments.map((s) => (
                            <div key={s.label} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="text-xs text-slate-500">
                                    {s.label} <span className="text-slate-700 font-medium">{s.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs text-slate-500">Completion rate</p>
                            <p className="text-xs font-medium text-slate-700">{ratePct}%</p>
                        </div>
                        <div className="h-2 rounded-full" style={{ backgroundColor: TODO_TINT }}>
                            <div
                                className="h-2 rounded-full transition-all"
                                style={{ width: `${ratePct}%`, backgroundColor: IN_PROGRESS_TINT }}
                            />
                        </div>
                    </div>

                    <details className="mt-4">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition">
                            View as table
                        </summary>
                        <table className="w-full mt-2 text-xs">
                            <thead>
                                <tr className="text-left text-slate-400">
                                    <th className="font-medium py-1">Status</th>
                                    <th className="font-medium py-1 text-right">Tasks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {segments.map((s) => (
                                    <tr key={s.label} className="border-t border-slate-100">
                                        <td className="py-1.5 text-slate-700">{s.label}</td>
                                        <td className="py-1.5 text-right text-slate-700">{s.value}</td>
                                    </tr>
                                ))}
                                <tr className="border-t border-slate-100">
                                    <td className="py-1.5 text-slate-700 font-medium">Completion rate</td>
                                    <td className="py-1.5 text-right text-slate-700 font-medium">{ratePct}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </details>
                </>
            )}
        </div>
    );
}
