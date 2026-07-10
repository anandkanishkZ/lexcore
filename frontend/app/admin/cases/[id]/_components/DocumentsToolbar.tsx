"use client";

import { Home, ChevronRight, LayoutGrid, List as ListIcon, Trash2, Search } from "lucide-react";
import NewMenu from "./NewMenu";
import type { BreadcrumbEntry } from "./documentTypes";

interface ToolbarProps {
    caseId: string;
    folderId?: string;
    breadcrumb: BreadcrumbEntry[];
    currentFolderName?: string;
    layout: "list" | "grid";
    trashView: boolean;
    search?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
}

export default function DocumentsToolbar({
    caseId,
    folderId,
    breadcrumb,
    currentFolderName,
    layout,
    trashView,
    search,
    type,
    sortBy,
    sortOrder,
}: ToolbarProps) {
    const base = `/admin/cases/${caseId}`;

    // Build a documents URL preserving the current context + overrides.
    function docUrl(overrides: Record<string, string | undefined>) {
        const params = new URLSearchParams({ tab: "documents" });
        const set = (k: string, v: string | undefined) => (v ? params.set(k, v) : params.delete(k));
        set("folder", trashView ? undefined : folderId);
        set("layout", layout === "grid" ? "grid" : undefined);
        set("search", search);
        set("type", type);
        set("sortBy", sortBy);
        set("sortOrder", sortOrder);
        set("view", trashView ? "trash" : undefined);
        for (const [k, v] of Object.entries(overrides)) set(k, v);
        const qs = params.toString();
        return qs ? `${base}?${qs}` : base;
    }

    // Auto-submit the filter form when a select changes.
    const submitForm = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();

    return (
        <div className="mb-4 space-y-3">
            {/* Row 1: breadcrumb + primary controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {trashView ? (
                    <a href={docUrl({ view: undefined, folder: undefined })} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                        Back to Documents
                    </a>
                ) : (
                    <nav className="flex items-center gap-1 text-sm min-w-0 flex-wrap">
                        <a
                            href={docUrl({ folder: undefined })}
                            className={`flex items-center gap-1 ${folderId ? "text-slate-500 hover:text-slate-700" : "text-slate-900 font-medium"}`}
                        >
                            <Home className="w-3.5 h-3.5" />
                            Root
                        </a>
                        {breadcrumb.map((crumb) => (
                            <span key={crumb._id} className="flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                <a href={docUrl({ folder: crumb._id })} className="text-slate-500 hover:text-slate-700 truncate max-w-[10rem]">
                                    {crumb.name}
                                </a>
                            </span>
                        ))}
                        {currentFolderName && (
                            <span className="flex items-center gap-1">
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-slate-900 font-medium truncate max-w-[12rem]">{currentFolderName}</span>
                            </span>
                        )}
                    </nav>
                )}

                <div className="flex items-center gap-2">
                    {/* layout toggle */}
                    <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <a
                            href={docUrl({ layout: undefined })}
                            title="List view"
                            className={`rounded-md p-1.5 transition ${layout === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </a>
                        <a
                            href={docUrl({ layout: "grid" })}
                            title="Grid view"
                            className={`rounded-md p-1.5 transition ${layout === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </a>
                    </div>

                    <a
                        href={trashView ? docUrl({ view: undefined, folder: undefined }) : docUrl({ view: "trash", folder: undefined })}
                        title="Trash"
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            trashView
                                ? "border-brand-gold text-brand-gold bg-brand-gold/5"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Trash</span>
                    </a>

                    {!trashView && <NewMenu caseId={caseId} folderId={folderId} />}
                </div>
            </div>

            {/* Row 2: search + filters (hidden in trash view) */}
            {!trashView && (
                <form action={base} method="GET" className="flex items-center gap-2 flex-wrap">
                    <input type="hidden" name="tab" value="documents" />
                    {folderId && <input type="hidden" name="folder" value={folderId} />}
                    {layout === "grid" && <input type="hidden" name="layout" value="grid" />}

                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            name="search"
                            defaultValue={search}
                            placeholder="Search in this folder…"
                            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition"
                        />
                    </div>
                    <select
                        name="type"
                        defaultValue={type ?? ""}
                        onChange={submitForm}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                    >
                        <option value="">All types</option>
                        <option value="pdf">PDF</option>
                        <option value="image">Image</option>
                        <option value="word">Word</option>
                        <option value="excel">Excel</option>
                    </select>
                    <select
                        name="sortBy"
                        defaultValue={sortBy ?? "createdAt"}
                        onChange={submitForm}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                    >
                        <option value="createdAt">Date</option>
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                    </select>
                    <select
                        name="sortOrder"
                        defaultValue={sortOrder ?? "desc"}
                        onChange={submitForm}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white"
                    >
                        <option value="desc">Newest</option>
                        <option value="asc">Oldest</option>
                    </select>
                </form>
            )}
        </div>
    );
}
