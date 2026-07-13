import { redirect } from "next/navigation";
import { fetchCaseAction } from "@/lib/actions/case";
import { fetchClientsAction } from "@/lib/actions/client";
import { fetchMembersAction } from "@/lib/actions/member";
import { toStaffOptions } from "@/lib/api/member";
import CaseForm from "../../_components/CaseForm";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditCasePage({ params }: PageProps) {
    const { id } = await params;

    const [caseResult, clientsResult, membersResult] = await Promise.all([
        fetchCaseAction(id),
        fetchClientsAction(1, 100),
        fetchMembersAction(1, 100),
    ]);

    if (!caseResult.success) {
        redirect("/admin/cases");
    }

    const c = caseResult.data;

    const clients = (clientsResult.data ?? []).map((cl: any) => ({
        _id: cl._id,
        firstName: cl.firstName,
        lastName: cl.lastName,
        email: cl.email,
    }));

    const attorneys = toStaffOptions(membersResult.data ?? []);

    // Convert ISO dates to YYYY-MM-DD for date input defaultValues
    const toDateInput = (iso: string | undefined) =>
        iso ? new Date(iso).toISOString().split("T")[0] : undefined;

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">Edit Case</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Update{" "}
                    <span className="font-mono text-slate-400">{c.caseNumber}</span> &mdash; {c.title}
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <CaseForm
                    mode="edit"
                    caseId={id}
                    clients={clients}
                    attorneys={attorneys}
                    defaultValues={{
                        title: c.title,
                        type: c.type,
                        status: c.status,
                        description: c.description ?? "",
                        client: c.client?._id ?? "",
                        assignedAttorney: c.assignedAttorney?._id ?? "",
                        openDate: toDateInput(c.openDate),
                        closeDate: toDateInput(c.closeDate),
                    }}
                />
            </div>
        </div>
    );
}
