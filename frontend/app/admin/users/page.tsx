import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { fetchMembersAction } from "@/lib/actions/member";
import UsersTable from "./_components/UsersTable";
import SearchBar from "./_components/SearchBar";
import Pagination from "./_components/Pagination";

interface PageProps {
    searchParams: Promise<{ page?: string; size?: string; search?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const size = parseInt(params.size || "10");
    const search = params.search || undefined;

    const result = await fetchMembersAction(page, size, search);

    if (!result.success) {
        redirect("/login");
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500">
                    Everyone registered in Lexcore &mdash; staff accounts and client
                    records
                    {result.meta?.total !== undefined && (
                        <span className="text-slate-400"> &middot; {result.meta.total} total</span>
                    )}
                </p>
                <Link
                    href="/admin/clients/create"
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Client
                </Link>
            </div>

            <div className="mb-4">
                <SearchBar defaultValue={search} size={size} />
            </div>

            <UsersTable members={result.data || []} />

            <Pagination
                page={result.meta?.page ?? page}
                size={result.meta?.limit ?? size}
                total={result.meta?.total ?? 0}
                search={search}
            />
        </div>
    );
}
