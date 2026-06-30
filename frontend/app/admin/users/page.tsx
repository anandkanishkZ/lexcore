import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, UserPlus } from "lucide-react";
import { fetchMembersAction } from "@/lib/actions/member";
import UsersTable from "./_components/UsersTable";
import SearchBar from "./_components/SearchBar";
import Pagination from "./_components/Pagination";
import AddUserButton from "./_components/AddUserButton";

interface PageProps {
    searchParams: Promise<{ page?: string; size?: string; search?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const size = parseInt(params.size || "10");
    const search = params.search || undefined;

    const result = await fetchMembersAction(page, size, search);

    if (!result.success && result.message === "Not authenticated") {
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
                <div className="flex items-center gap-2">
                    <AddUserButton />
                    <Link
                        href="/admin/clients/create"
                        className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Client
                    </Link>
                </div>
            </div>

            <div className="mb-4">
                <SearchBar defaultValue={search} size={size} />
            </div>

            {!result.success ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Couldn&apos;t load users</p>
                    <p className="text-xs text-slate-500 mt-1">{result.message || "Something went wrong."}</p>
                </div>
            ) : (
                <>
                    <UsersTable members={result.data || []} />
                    <Pagination
                        page={result.meta?.page ?? page}
                        size={result.meta?.limit ?? size}
                        total={result.meta?.total ?? 0}
                        search={search}
                    />
                </>
            )}
        </div>
    );
}
