import Link from "next/link";
import {
    Users,
    UserCheck,
    UserX,
    UserPlus,
    Briefcase,
    FolderOpen,
    CalendarDays,
    Receipt,
    ArrowRight,
} from "lucide-react";
import { handleUserDetails } from "@/lib/actions/auth";
import { fetchClientsAction } from "@/lib/actions/client";
import StatCard from "./_components/StatCard";

interface DashboardClient {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt: string;
}

const roadmapModules = [
    { label: "Case & Matter Management", icon: Briefcase, sprint: "Sprint 6" },
    { label: "Document Management (DMS)", icon: FolderOpen, sprint: "Sprint 7" },
    { label: "Calendar & Court Diary", icon: CalendarDays, sprint: "Sprint 9" },
    { label: "Billing & Invoicing", icon: Receipt, sprint: "Sprint 9" },
];

export default async function AdminDashboardPage() {
    const [userResult, clientsResult] = await Promise.all([
        handleUserDetails(),
        fetchClientsAction(1, 100),
    ]);

    const firstName = userResult.success ? userResult.data.firstName : "there";
    const clients: DashboardClient[] = clientsResult.success ? clientsResult.data || [] : [];

    const total = clientsResult.success ? clientsResult.meta?.total ?? clients.length : 0;
    const active = clients.filter((c) => c.status === "active").length;
    const inactive = clients.filter((c) => c.status !== "active").length;

    const now = new Date();
    const newThisMonth = clients.filter((c) => {
        const created = new Date(c.createdAt);
        return (
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear()
        );
    }).length;

    const recentClients = clients.slice(0, 5);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                    Welcome back, {firstName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Here&apos;s what&apos;s happening at your firm today.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Clients" value={total} icon={Users} />
                <StatCard label="Active Clients" value={active} icon={UserCheck} tone="positive" />
                <StatCard label="Inactive Clients" value={inactive} icon={UserX} tone="warning" />
                <StatCard label="New This Month" value={newThisMonth} icon={UserPlus} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">Recent Clients</h3>
                        <Link
                            href="/admin/users"
                            className="flex items-center gap-1 text-xs font-medium text-brand-gold hover:underline"
                        >
                            View all
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {recentClients.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            No clients yet.{" "}
                            <Link href="/admin/clients/create" className="text-brand-gold hover:underline">
                                Add your first client
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {recentClients.map((client) => (
                                <li key={client._id}>
                                    <Link
                                        href={`/admin/clients/${client._id}`}
                                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-medium text-slate-600">
                                                {client.firstName[0]}
                                                {client.lastName[0]}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {client.firstName} {client.lastName}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{client.email}</p>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${
                                                client.status === "active"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-red-50 text-red-600"
                                            }`}
                                        >
                                            {client.status}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
                        <Link
                            href="/admin/clients/create"
                            className="flex items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Client
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">Platform Roadmap</h3>
                        <p className="text-xs text-slate-500 mb-4">Modules planned for upcoming sprints.</p>
                        <ul className="space-y-3">
                            {roadmapModules.map((mod) => (
                                <li key={mod.label} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                        <mod.icon className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-slate-700 truncate">{mod.label}</p>
                                    </div>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                                        {mod.sprint}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
