import { AlertCircle } from "lucide-react";
import { fetchDocumentRequestsAction } from "@/lib/actions/document-request";
import DocumentRequestsTable from "./DocumentRequestsTable";

export default async function DocumentRequestsPanel({ caseId }: { caseId: string }) {
    const result = await fetchDocumentRequestsAction(caseId);

    if (!result.success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-slate-700">Couldn&apos;t load document requests</p>
                <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
            </div>
        );
    }

    return <DocumentRequestsTable caseId={caseId} requests={result.data ?? []} />;
}
