"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import StatusBadge from "@/app/admin/_components/StatusBadge";
import type { ProfileUser } from "./types";
import { formatDate, formatDateTime, roleLabel, userTypeLabel } from "./types";
import FormPanel from "./FormPanel";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="text-right text-sm font-medium text-slate-900">{children}</dd>
        </div>
    );
}

/** The account id is the value support will ask for when diagnosing
 * something, so it's shown in full rather than truncated — with a copy
 * button, since a 24-character hex string is miserable to transcribe. */
function AccountId({ id }: { id: string }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            type="button"
            onClick={() => {
                navigator.clipboard.writeText(id).then(
                    () => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    },
                    // Clipboard access can be denied (insecure origin, or the
                    // user blocked it) — fail quietly rather than throwing.
                    () => {}
                );
            }}
            title="Copy account ID"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/40"
        >
            {id}
            {copied ? (
                <Check className="h-3 w-3 text-emerald-600" />
            ) : (
                <Copy className="h-3 w-3 text-slate-400" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy account ID"}</span>
        </button>
    );
}

export default function AccountDetails({ user }: { user: ProfileUser }) {
    return (
        <FormPanel
            title="Account"
            description="Read-only details maintained by your firm administrator."
        >
            <dl className="divide-y divide-slate-100">
                <Row label="Access level">
                    <StatusBadge
                        label={roleLabel(user.role)}
                        tone={user.role === "admin" ? "info" : "neutral"}
                    />
                </Row>
                <Row label="Professional title">{userTypeLabel(user.userType)}</Row>
                <Row label="Status">
                    <StatusBadge
                        label={user.isActive ? "Active" : "Deactivated"}
                        tone={user.isActive ? "success" : "danger"}
                    />
                </Row>
                <Row label="Member since">{formatDate(user.createdAt)}</Row>
                <Row label="Last updated">{formatDateTime(user.updatedAt)}</Row>
                <Row label="Account ID">
                    <AccountId id={user._id} />
                </Row>
            </dl>
        </FormPanel>
    );
}
