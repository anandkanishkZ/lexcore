import { fetchClientAction } from "@/lib/actions/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import SummaryPanel from "./_components/SummaryPanel";
import CasesPanel from "./_components/CasesPanel";
import BillingPanel from "./_components/BillingPanel";
import ClientDocumentsPanel from "./_components/ClientDocumentsPanel";
import ClientMessagesPanel from "./_components/ClientMessagesPanel";
import TasksPanel from "./_components/TasksPanel";

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}

const TABS = [
    { key: "summary", label: "Summary" },
    { key: "cases", label: "Cases" },
    { key: "billing", label: "Billing" },
    { key: "documents", label: "Documents" },
    { key: "messages", label: "Messages" },
    { key: "tasks", label: "Tasks" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const { tab: tabParam } = await searchParams;
    const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "summary";

    const result = await fetchClientAction(id);
    if (!result.success) {
        redirect("/admin/users");
    }

    const client = result.data;

    return (
        <div className={tab === "summary" ? "max-w-2xl" : "max-w-5xl"}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        {client.firstName} {client.lastName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">Client details and information.</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/admin/clients/${id}/edit`}
                        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/admin/users"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Back
                    </Link>
                </div>
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 w-fit mb-4 overflow-x-auto">
                {TABS.map((t) => (
                    <Link
                        key={t.key}
                        href={t.key === "summary" ? `/admin/clients/${id}` : `/admin/clients/${id}?tab=${t.key}`}
                        className={`rounded-md px-4 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                            tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {t.label}
                    </Link>
                ))}
            </div>

            {tab === "cases" ? (
                <CasesPanel clientId={id} />
            ) : tab === "billing" ? (
                <BillingPanel clientId={id} />
            ) : tab === "documents" ? (
                <ClientDocumentsPanel clientId={id} />
            ) : tab === "messages" ? (
                <ClientMessagesPanel clientId={id} />
            ) : tab === "tasks" ? (
                <TasksPanel clientId={id} />
            ) : (
                <SummaryPanel client={client} />
            )}
        </div>
    );
}
