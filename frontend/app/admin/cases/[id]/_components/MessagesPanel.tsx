import { AlertCircle } from "lucide-react";
import { fetchMessagesAction, getSocketTokenAction } from "@/lib/actions/message";
import MessagesThread from "./MessagesThread";

export default async function MessagesPanel({ caseId }: { caseId: string }) {
    const [messagesResult, tokenResult] = await Promise.all([
        fetchMessagesAction(caseId),
        getSocketTokenAction(),
    ]);

    if (!messagesResult.success || !tokenResult.success) {
        const errorMessage = !messagesResult.success
            ? messagesResult.message
            : !tokenResult.success
              ? tokenResult.message
              : undefined;
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load messages</p>
                <p className="text-xs text-slate-500 mt-1">{errorMessage}</p>
            </div>
        );
    }

    return <MessagesThread caseId={caseId} initialMessages={messagesResult.data ?? []} token={tokenResult.data} />;
}
