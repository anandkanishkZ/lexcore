import AiSearchClient from "./_components/AiSearchClient";

export default function AiSearchPage() {
    return (
        <div className="max-w-3xl">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Workspace</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">AI Search</h1>
            <p className="mt-1 text-sm text-slate-500">
                Ask a question about your cases and documents — answers are grounded in what&apos;s actually on file.
            </p>

            <div className="mt-6">
                <AiSearchClient />
            </div>
        </div>
    );
}
