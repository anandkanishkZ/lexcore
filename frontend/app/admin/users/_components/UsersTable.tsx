"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck, Users as UsersIcon, Eye, Pencil, Trash2, UserX, UserCheck } from "lucide-react";
import { fetchAdminUserAction, setAdminUserActiveAction } from "@/lib/actions/admin-user";
import UserFormModal from "./UserFormModal";
import DeleteUserModal from "./DeleteUserModal";
import type { CreateUserFormData } from "./userSchema";

export interface Member {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    // Which record this row's data came from — NOT a permission signal.
    // See `isStaff` for staff/client, `hasPortalAccess` for can-they-log-in.
    source: "account" | "contact";
    isStaff: boolean;
    hasPortalAccess: boolean;
    subtype: string;
    status: string | null;
    createdAt: string;
}

function detailHref(m: Member) {
    return m.source === "contact" ? `/admin/clients/${m._id}` : undefined;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function UsersTable({ members }: { members: Member[] }) {
    const router = useRouter();
    const [editTarget, setEditTarget] = useState<{ id: string; defaults: Partial<CreateUserFormData> } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const toggleActive = (id: string, nextActive: boolean) => {
        setTogglingId(id);
        startTransition(async () => {
            const result = await setAdminUserActiveAction(id, nextActive);
            setTogglingId(null);
            if (result.success) {
                router.refresh();
            } else {
                alert(result.message || "Failed to update status");
            }
        });
    };

    const openEdit = async (id: string) => {
        setLoadingEditId(id);
        const result = await fetchAdminUserAction(id);
        setLoadingEditId(null);
        if (result.success) {
            const u = result.data;
            setEditTarget({
                id,
                defaults: {
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    userType: u.userType,
                    role: u.role,
                },
            });
        }
    };

    if (members.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                        <UsersIcon className="w-6 h-6 text-slate-400" strokeWidth={1.75} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No one found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Name</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Phone</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Account</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Role</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-500">Joined</th>
                            <th className="text-right py-3 px-4 font-medium text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((m) => {
                            const href = detailHref(m);
                            return (
                                <tr
                                    key={`${m.source}-${m._id}`}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition"
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-medium text-slate-600">
                                                    {m.firstName[0]}
                                                    {m.lastName[0]}
                                                </span>
                                            </div>
                                            <p className="font-medium text-slate-900 truncate">
                                                {m.firstName} {m.lastName}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">{m.email}</td>
                                    <td className="py-3 px-4 text-slate-600">{m.phone || "—"}</td>
                                    <td className="py-3 px-4">
                                        {m.hasPortalAccess ? (
                                            <span
                                                title="Can sign in to Lexcore"
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700"
                                            >
                                                <ShieldCheck className="w-3 h-3" />
                                                Portal login
                                            </span>
                                        ) : (
                                            <span
                                                title="CRM contact only — no login"
                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500"
                                            >
                                                <UsersIcon className="w-3 h-3" />
                                                Contact only
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 capitalize">
                                            {m.subtype}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {m.status ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full capitalize ${
                                                    m.status === "active"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-red-50 text-red-600"
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        m.status === "active" ? "bg-emerald-500" : "bg-red-500"
                                                    }`}
                                                />
                                                {m.status}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                                        {formatDate(m.createdAt)}
                                    </td>
                                    <td className="py-3 px-4">
                                        {href ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={href}
                                                    title="View"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`${href}/edit`}
                                                    title="Edit"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(m._id)}
                                                    disabled={loadingEditId === m._id}
                                                    title="Edit"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-gold hover:bg-slate-100 transition disabled:opacity-50"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleActive(m._id, m.status === "inactive")}
                                                    disabled={isPending && togglingId === m._id}
                                                    title={
                                                        m.status === "inactive"
                                                            ? "Reactivate — restores their ability to log in"
                                                            : "Deactivate — the preferred alternative to deleting someone with open work assigned"
                                                    }
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition disabled:opacity-50"
                                                >
                                                    {m.status === "inactive" ? (
                                                        <UserCheck className="w-4 h-4" />
                                                    ) : (
                                                        <UserX className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setDeleteTarget({ id: m._id, name: `${m.firstName} ${m.lastName}` })
                                                    }
                                                    title="Delete"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {editTarget && (
                <UserFormModal
                    mode="edit"
                    userId={editTarget.id}
                    defaultValues={editTarget.defaults}
                    onClose={() => setEditTarget(null)}
                    onSuccess={() => {
                        setEditTarget(null);
                        router.refresh();
                    }}
                />
            )}

            {deleteTarget && (
                <DeleteUserModal
                    userId={deleteTarget.id}
                    name={deleteTarget.name}
                    onClose={() => setDeleteTarget(null)}
                    onSuccess={() => {
                        setDeleteTarget(null);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
