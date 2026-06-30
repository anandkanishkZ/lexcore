import Link from "next/link";
import { UserPlus } from "lucide-react";
import { fetchClientsAction } from "@/lib/actions/client";
import { fetchUsersAction } from "@/lib/actions/user";
import UsersTable, { type Member } from "./_components/UsersTable";

const MAX_FETCH = 200;

interface ApiUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    userType: string;
    createdAt: string;
}

interface ApiClient {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: string;
    status: string;
    createdAt: string;
}

export default async function UsersPage() {
    const [clientsResult, usersResult] = await Promise.all([
        fetchClientsAction(1, MAX_FETCH),
        fetchUsersAction(1, MAX_FETCH),
    ]);

    const members: Member[] = [
        ...(usersResult.success ? usersResult.data || [] : []).map(
            (u: ApiUser): Member => ({
                id: u._id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phone: undefined,
                category: "staff",
                subtype: u.role === "admin" ? "admin" : u.userType,
                status: undefined,
                createdAt: u.createdAt,
                detailHref: undefined,
            })
        ),
        ...(clientsResult.success ? clientsResult.data || [] : []).map(
            (c: ApiClient): Member => ({
                id: c._id,
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
                phone: c.phone,
                category: "client",
                subtype: c.type,
                status: c.status,
                createdAt: c.createdAt,
                detailHref: `/admin/clients/${c._id}`,
            })
        ),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500">
                    Everyone registered in Lexcore &mdash; staff accounts and client
                    records &middot; {members.length} total
                </p>
                <Link
                    href="/admin/clients/create"
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Client
                </Link>
            </div>

            <UsersTable members={members} />
        </div>
    );
}
