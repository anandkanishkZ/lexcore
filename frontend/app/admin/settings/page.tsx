import { redirect } from "next/navigation";
import { fetchFirmSettingsAction } from "@/lib/actions/settings";
import FirmSettingsForm from "./_components/FirmSettingsForm";

export default async function SettingsPage() {
    const result = await fetchFirmSettingsAction();

    if (!result.success && result.message === "Not authenticated") {
        redirect("/login");
    }

    const settings = result.data ?? {};

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">Firm Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    General profile shown across the console — logo, contact details, practice areas.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <FirmSettingsForm
                    defaultValues={{
                        name: settings.name ?? "Lexcore",
                        logoUrl: settings.logoUrl ?? "",
                        address: settings.address ?? "",
                        phone: settings.phone ?? "",
                        email: settings.email ?? "",
                        website: settings.website ?? "",
                        currency: settings.currency ?? "USD",
                        practiceAreas: (settings.practiceAreas ?? []).join(", "),
                    }}
                />
            </div>
        </div>
    );
}
