"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteClientAction } from "@/lib/actions/client";

interface Client {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    type: string;
    companyName?: string;
    status: string;
    createdAt: string;
}

interface ClientTableProps {
    clients: Client[];
}

export default function ClientTable({ clients }: ClientTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        startTransition(async () => {
            const result = await deleteClientAction(id);
            if (result.success) {
                router.refresh();
            }
        });
    };

    if (clients.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 text-sm">
                No clients found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">
                            Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">
                            Email
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">
                            Phone
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">
                            Type
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-slate-500">
                            Status
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-slate-500">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client) => (
                        <tr
                            key={client._id}
                            className="border-b border-slate-100 hover:bg-slate-50 transition"
                        >
                            <td className="py-3 px-4">
                                <Link
                                    href={`/admin/clients/${client._id}`}
                                    className="font-medium text-slate-900 hover:text-brand transition"
                                >
                                    {client.firstName} {client.lastName}
                                </Link>
                                {client.companyName && (
                                    <p className="text-xs text-slate-400">
                                        {client.companyName}
                                    </p>
                                )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                                {client.email}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                                {client.phone}
                            </td>
                            <td className="py-3 px-4">
                                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 capitalize">
                                    {client.type}
                                </span>
                            </td>
                            <td className="py-3 px-4">
                                <span
                                    className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${
                                        client.status === "active"
                                            ? "bg-green-50 text-green-700"
                                            : "bg-red-50 text-red-600"
                                    }`}
                                >
                                    {client.status}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Link
                                        href={`/admin/clients/${client._id}`}
                                        className="text-xs text-slate-500 hover:text-brand transition"
                                    >
                                        View
                                    </Link>
                                    <Link
                                        href={`/admin/clients/${client._id}/edit`}
                                        className="text-xs text-slate-500 hover:text-brand transition"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() =>
                                            handleDelete(
                                                client._id,
                                                `${client.firstName} ${client.lastName}`
                                            )
                                        }
                                        disabled={isPending}
                                        className="text-xs text-red-500 hover:text-red-700 transition disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
