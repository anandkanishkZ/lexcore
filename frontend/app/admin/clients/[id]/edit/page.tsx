import { fetchClientAction } from "@/lib/actions/client";
import { redirect } from "next/navigation";
import ClientForm from "../../_components/ClientForm";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: PageProps) {
    const { id } = await params;
    const result = await fetchClientAction(id);

    if (!result.success) {
        redirect("/admin/clients");
    }

    const client = result.data;

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Edit Client
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Update {client.firstName} {client.lastName}&apos;s
                    information.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <ClientForm
                    mode="edit"
                    clientId={id}
                    defaultValues={{
                        firstName: client.firstName,
                        lastName: client.lastName,
                        email: client.email,
                        phone: client.phone,
                        type: client.type,
                        companyName: client.companyName || "",
                        address: client.address || "",
                    }}
                />
            </div>
        </div>
    );
}
