import { redirect } from "next/navigation";
import { fetchClientsAction } from "@/lib/actions/client";
import { fetchCasesAction } from "@/lib/actions/case";
import { fetchFirmSettingsAction } from "@/lib/actions/settings";
import InvoiceForm from "../_components/InvoiceForm";

export default async function CreateInvoicePage() {
    const [clientsResult, casesResult, settingsResult] = await Promise.all([
        fetchClientsAction(1, 100),
        fetchCasesAction(1, 100),
        fetchFirmSettingsAction(),
    ]);
    const currency: string = settingsResult.success ? (settingsResult.data?.currency ?? "USD") : "USD";

    if (!clientsResult.success && clientsResult.message === "Not authenticated") {
        redirect("/login");
    }

    const clients = (clientsResult.data ?? []).map((c: any) => ({
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
    }));
    const cases = (casesResult.data ?? []).map((c: any) => ({
        _id: c._id,
        title: c.title,
        caseNumber: c.caseNumber,
    }));

    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">New Invoice</h1>
                <p className="mt-1 text-sm text-slate-500">Bill a client for time, fees, or filing costs.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <InvoiceForm clients={clients} cases={cases} currency={currency} />
            </div>
        </div>
    );
}
