import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Plus, ChevronLeft, ChevronRight, List, Kanban } from "lucide-react";
import { fetchCasesAction } from "@/lib/actions/case";
import CasesTable from "./_components/CasesTable";
import CasesBoard from "./_components/CasesBoard";

interface PageProps {
    searchParams: Promise<{ page?: string; size?: string; search?: string; status?: string; view?: string }>;
}

export default async function CasesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const view = params.view === "board" ? "board" : "list";
    const page = parseInt(params.page || "1");
    // Board view groups every case into status columns, so it fetches a much
    // larger page instead of the list view's paginated 10 — there's no
    // per-column pagination yet.
    const size = view === "board" ? 200 : parseInt(params.size || "10");
    const search = params.search || undefined;
    const status = params.status || undefined;

    const result = await fetchCasesAction(page, size, search, status);

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    const cases: any[] = result.data || [];
    const total: number = result.meta?.total ?? 0;
    const totalPages = Math.ceil(total / size);

    function buildUrl(p: number, q?: string, st?: string) {
        const sp = new URLSearchParams({ page: String(p), size: String(size) });
        if (q) sp.set("search", q);
        if (st) sp.set("status", st);
        if (view === "board") sp.set("view", "board");
        return `/admin/cases?${sp}`;
    }

    function viewUrl(v: "list" | "board") {
        const sp = new URLSearchParams({ page: "1", size: v === "board" ? "200" : "10" });
        if (search) sp.set("search", search);
        if (status) sp.set("status", status);
        if (v === "board") sp.set("view", "board");
        return `/admin/cases?${sp}`;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <p className="text-sm text-slate-500">
                    All cases managed in Lexcore
                    {total > 0 && (
                        <span className="text-slate-400"> &middot; {total} total</span>
                    )}
                </p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <Link
                            href={viewUrl("list")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            List
                        </Link>
                        <Link
                            href={viewUrl("board")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                view === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <Kanban className="w-3.5 h-3.5" />
                            Board
                        </Link>
                    </div>
                    <Link
                        href="/admin/cases/create"
                        className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                    >
                        <Plus className="w-4 h-4" />
                        New Case
                    </Link>
                </div>
            </div>

            {/* Search + Status filter */}
            <form className="mb-4 flex gap-3 flex-wrap" action="/admin/cases" method="GET">
                <input type="hidden" name="size" value={size} />
                <input
                    name="search"
                    defaultValue={search}
                    placeholder="Search by title, case number…"
                    className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                />
                <select
                    name="status"
                    defaultValue={status ?? ""}
                    className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                >
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="on hold">On Hold</option>
                    <option value="closed">Closed</option>
                </select>
            </form>

            {!result.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load cases</p>
                    <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
                </div>
            ) : cases.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-medium text-slate-700">No cases found</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {search || status
                            ? "Try adjusting your filters."
                            : "Create your first case to get started."}
                    </p>
                </div>
            ) : view === "board" ? (
                <CasesBoard cases={cases} />
            ) : (
                <>
                    <CasesTable cases={cases} />

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-1 py-3">
                            <p className="text-xs text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-1">
                                {page > 1 && (
                                    <Link
                                        href={buildUrl(page - 1, search, status)}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Link>
                                )}
                                {page < totalPages && (
                                    <Link
                                        href={buildUrl(page + 1, search, status)}
                                        className="p-1.5 rounded hover:bg-slate-100 transition text-slate-500"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
