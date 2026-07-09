import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchCaseAction } from "@/lib/actions/case";
import DocumentsPanel from "./_components/DocumentsPanel";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string; folder?: string }>;
}

const statusStyles: Record<string, string> = {
    open: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    closed: "bg-slate-100 text-slate-500",
    "on hold": "bg-blue-50 text-blue-600",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <div className="mt-1 text-sm text-slate-900">{children}</div>
        </div>
    );
}

export default async function CaseDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { tab: tabParam, folder } = await searchParams;
    const tab = tabParam === "documents" ? "documents" : "details";
    const result = await fetchCaseAction(id);

    if (!result.success) {
        redirect("/admin/cases");
    }

    const c = result.data;

    return (
        <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">{c.title}</h1>
                    <p className="mt-1 text-sm font-mono text-slate-400">{c.caseNumber}</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/admin/cases/${id}/edit`}
                        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/admin/cases"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Back
                    </Link>
                </div>
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-fit mb-4">
                <Link
                    href={`/admin/cases/${id}`}
                    className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                        tab === "details" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    Details
                </Link>
                <Link
                    href={`/admin/cases/${id}?tab=documents`}
                    className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                        tab === "documents" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    Documents
                </Link>
            </div>

            {tab === "documents" ? (
                <DocumentsPanel caseId={id} folderId={folder} />
            ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                {/* Status + Type row */}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Status">
                        <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs capitalize ${
                                statusStyles[c.status] ?? "bg-slate-100 text-slate-600"
                            }`}
                        >
                            {c.status}
                        </span>
                    </Field>
                    <Field label="Case Type">
                        <span className="capitalize">{c.type}</span>
                    </Field>
                </div>

                {/* Client */}
                <Field label="Client">
                    {c.client ? (
                        <Link
                            href={`/admin/clients/${c.client._id}`}
                            className="text-brand-gold hover:underline"
                        >
                            {c.client.firstName} {c.client.lastName}
                        </Link>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </Field>

                {/* Assigned Attorney */}
                <Field label="Assigned Attorney">
                    {c.assignedAttorney ? (
                        <span>
                            {c.assignedAttorney.firstName} {c.assignedAttorney.lastName}
                            <span className="text-slate-400 ml-1 capitalize">
                                ({c.assignedAttorney.userType})
                            </span>
                        </span>
                    ) : (
                        <span className="text-slate-400">Unassigned</span>
                    )}
                </Field>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Open Date">
                        {c.openDate
                            ? new Date(c.openDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                              })
                            : "—"}
                    </Field>
                    <Field label="Close Date">
                        {c.closeDate
                            ? new Date(c.closeDate).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                              })
                            : <span className="text-slate-400">Open</span>}
                    </Field>
                </div>

                {/* Description */}
                {c.description && (
                    <Field label="Description">
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{c.description}</p>
                    </Field>
                )}

                {/* Created by */}
                <div className="border-t border-slate-100 pt-4">
                    <Field label="Created By">
                        {c.createdBy
                            ? `${c.createdBy.firstName} ${c.createdBy.lastName}`
                            : "—"}
                    </Field>
                </div>
            </div>
            )}
        </div>
    );
}
