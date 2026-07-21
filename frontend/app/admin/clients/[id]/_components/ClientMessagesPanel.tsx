import Link from "next/link";
import { MessageSquare, AlertCircle } from "lucide-react";
import { fetchClientMessagesAction } from "@/lib/actions/message";

export default async function ClientMessagesPanel({ clientId }: { clientId: string }) {
    const result = await fetchClientMessagesAction(clientId);

    if (!result.success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load messages</p>
                <p className="text-xs text-slate-500 mt-1">{result.message}</p>
            </div>
        );
    }

    const messages: any[] = result.data ?? [];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                {messages.length} message{messages.length === 1 ? "" : "s"} across all cases
            </p>

            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No messages yet</p>
                    <p className="text-xs text-slate-500 mt-1">Conversations on this client&apos;s cases will show up here.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {messages.map((m) => (
                        <Link
                            key={m._id}
                            href={m.case ? `/admin/cases/${m.case._id}?tab=messages` : "#"}
                            className="flex items-start justify-between gap-4 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition"
                        >
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-500">
                                    {m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : "Unknown"}
                                    <span className="text-slate-300"> &middot; {m.case?.title ?? "Unknown case"}</span>
                                </p>
                                <p className="text-sm text-slate-900 mt-0.5 truncate">{m.content || "(attachment)"}</p>
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                                {new Date(m.createdAt).toLocaleDateString()}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
