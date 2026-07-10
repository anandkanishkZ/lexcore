import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Inbox } from "lucide-react";
import { fetchCaseRequestsAction } from "@/lib/actions/case-request";
import { fetchMembersAction } from "@/lib/actions/member";
import CaseRequestsTable from "./_components/CaseRequestsTable";

interface PageProps {
    searchParams: Promise<{ status?: string }>;
}

const TABS = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
] as const;

export default async function CaseRequestsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = TABS.some((t) => t.value === params.status) ? params.status! : "pending";

    const [requestsResult, membersResult] = await Promise.all([
        fetchCaseRequestsAction(status),
        fetchMembersAction(1, 100),
    ]);

    if (!requestsResult.success && requestsResult.message === "Not authenticated") {
        redirect("/login");
    }

    const requests: any[] = requestsResult.data || [];
    const attorneys = (membersResult.data ?? [])
        .filter((u: any) => u.userType !== "client")
        .map((u: any) => ({
            _id: u._id,
            firstName: u.firstName,
            lastName: u.lastName,
            userType: u.userType,
        }));

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <p className="text-sm text-slate-500">Case requests submitted by clients through the portal app</p>
                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {TABS.map((t) => (
                        <Link
                            key={t.value}
                            href={`/admin/case-requests?status=${t.value}`}
                            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                                status === t.value
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            {t.label}
                        </Link>
                    ))}
                </div>
            </div>

            {!requestsResult.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load case requests</p>
                    <p className="text-xs text-slate-500 mt-1">{requestsResult.message || "Something went wrong."}</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                        <Inbox className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No {status} requests</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {status === "pending"
                            ? "New requests from clients will show up here."
                            : `Nothing has been ${status} yet.`}
                    </p>
                </div>
            ) : (
                <CaseRequestsTable requests={requests} attorneys={attorneys} />
            )}
        </div>
    );
}
