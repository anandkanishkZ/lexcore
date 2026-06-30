"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus } from "lucide-react";
import UserFormModal from "./UserFormModal";

export default function AddUserButton() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
                <ShieldPlus className="w-4 h-4" />
                Add User
            </button>

            {open && (
                <UserFormModal
                    mode="create"
                    onClose={() => setOpen(false)}
                    onSuccess={() => {
                        setOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}
