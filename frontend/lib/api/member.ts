const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/**
 * Shape of each row returned by GET /members — it merges the Client (CRM)
 * and User (login) collections into one directory (see
 * MemberMongoRepository.getAll). A person who is both a CRM contact and a
 * portal login (their Client.linkedUserId points at their User) is
 * represented by ONE merged row, sourced from their Client record, not two.
 *
 * `source` reflects which record a row's displayed data came from — NOT
 * whether the person is staff or can log in. Use [isStaff] for the
 * permission-relevant fact (computed server-side from the real
 * User.role/userType, the same rule staffMiddleware enforces) and
 * [hasPortalAccess] for "can this person sign in at all."
 *
 * `subtype` is the display role: "attorney"/"paralegal"/"admin"/etc. for
 * staff, or the CRM contact's individual/company `type` for a `source:
 * "contact"` row.
 */
export interface MemberRow {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    source: "account" | "contact";
    isStaff: boolean;
    hasPortalAccess: boolean;
    subtype: string;
    status: string | null;
    createdAt: string;
}

export interface StaffOption {
    _id: string;
    firstName: string;
    lastName: string;
    userType: string;
}

/**
 * Narrows a /members result down to genuine staff, for every "assign to a
 * staff member" dropdown (case attorney, task assignee, case-request
 * approval). Centralized here so the client/staff distinction is made
 * correctly in exactly one place, off the single authoritative `isStaff`
 * flag rather than a compound condition reconstructed inline — a previous
 * version of this check (`userType !== "client"`) tested a field that
 * doesn't even exist on this shape, so it silently included every client as
 * an assignable "attorney" everywhere.
 */
export function toStaffOptions(members: MemberRow[]): StaffOption[] {
    return members
        .filter((m) => m.isStaff)
        .map((m) => ({
            _id: m._id,
            firstName: m.firstName,
            lastName: m.lastName,
            userType: m.subtype,
        }));
}

export async function fetchMembersApi(
    token: string,
    page: number = 1,
    size: number = 10,
    search?: string
) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (search) params.set("search", search);

    const res = await fetch(`${API_URL}/api/v1/members?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
