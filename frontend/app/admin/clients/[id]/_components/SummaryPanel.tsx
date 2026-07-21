function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
            <div className="mt-1 text-sm text-slate-900">{children}</div>
        </div>
    );
}

export default function SummaryPanel({ client }: { client: any }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Field label="First Name">{client.firstName}</Field>
                <Field label="Last Name">{client.lastName}</Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Email">{client.email}</Field>
                <Field label="Phone">{client.phone}</Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                    <span className="capitalize">{client.type}</span>
                </Field>
                <Field label="Status">
                    <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                            client.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}
                    >
                        {client.status}
                    </span>
                </Field>
            </div>

            {client.companyName && <Field label="Company">{client.companyName}</Field>}
            {client.address && <Field label="Address">{client.address}</Field>}

            {client.createdBy && (
                <Field label="Created By">
                    {client.createdBy.firstName} {client.createdBy.lastName}
                </Field>
            )}

            <Field label="Created At">
                {new Date(client.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}
            </Field>
        </div>
    );
}
