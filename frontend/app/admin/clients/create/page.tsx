import ClientForm from "../_components/ClientForm";

export default function CreateClientPage() {
    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Add New Client
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Enter the client&apos;s information below.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <ClientForm mode="create" />
            </div>
        </div>
    );
}
