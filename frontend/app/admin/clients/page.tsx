import { fetchClientsAction } from "@/lib/actions/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientTable from "./_components/ClientTable";
import Pagination from "./_components/Pagination";
import SearchBar from "./_components/SearchBar";

interface PageProps {
    searchParams: Promise<{ page?: string; size?: string; search?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const size = parseInt(params.size || "10");
    const search = params.search || undefined;

    const result = await fetchClientsAction(page, size, search);

    if (!result.success) {
        redirect("/login");
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Clients
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage your firm&apos;s clients and contacts.
                    </p>
                </div>
                <Link
                    href="/admin/clients/create"
                    className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a2540] transition"
                >
                    Add Client
                </Link>
            </div>

            <div className="mb-4">
                <SearchBar defaultValue={search} size={size} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <ClientTable clients={result.data || []} />
            </div>

            {result.meta && (
                <Pagination
                    page={result.meta.page}
                    size={result.meta.limit}
                    total={result.meta.total}
                    search={search}
                />
            )}
        </div>
    );
}
