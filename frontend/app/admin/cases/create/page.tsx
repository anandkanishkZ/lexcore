import { redirect } from "next/navigation";
import { fetchClientsAction } from "@/lib/actions/client";
import { fetchMembersAction } from "@/lib/actions/member";
import CaseForm from "../_components/CaseForm";

export default async function CreateCasePage() {
    const [clientsResult, membersResult] = await Promise.all([
        fetchClientsAction(1, 100),
        fetchMembersAction(1, 100),
    ]);

    if (!clientsResult.success && clientsResult.message === "Not authenticated") {
        redirect("/login");
    }

    const clients = (clientsResult.data ?? []).map((c: any) => ({
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
    }));

    // Filter to non-client user types eligible as attorneys
    const attorneys = (membersResult.data ?? [])
        .filter((u: any) => u.userType !== "client")
        .map((u: any) => ({
            _id: u._id,
            firstName: u.firstName,
            lastName: u.lastName,
            userType: u.userType,
        }));

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">New Case</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Open a new case and assign it to a client and attorney.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <CaseForm mode="create" clients={clients} attorneys={attorneys} />
            </div>
        </div>
    );
}
