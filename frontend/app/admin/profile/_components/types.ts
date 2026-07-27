/** The profile shape the API's `toPublicUser` returns (see the backend's
 * models/user.model.ts) — kept in one place so the hero, the forms, and the
 * account panel can't drift on what a user actually has. */
export interface ProfileUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    role: string;
    isActive: boolean;
    profileImage: string;
    createdAt: string;
    updatedAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/** Stored avatars are API-relative paths (`/uploads/…`); absolute URLs are
 * passed through so a future move to object storage doesn't break this. */
export function avatarUrl(profileImage: string): string | null {
    if (!profileImage) return null;
    return /^https?:\/\//i.test(profileImage) ? profileImage : `${API_URL}${profileImage}`;
}

export function fullName(user: Pick<ProfileUser, "firstName" | "lastName">): string {
    return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: Pick<ProfileUser, "firstName" | "lastName">): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

/** `role` is the coarse authorization flag (admin vs. everyone else), while
 * `userType` is the descriptive job title — they're different fields on the
 * user and both are worth showing, so label them distinctly. */
export function roleLabel(role: string): string {
    return role === "admin" ? "Administrator" : "Standard access";
}

export function userTypeLabel(userType: string): string {
    if (!userType) return "Unspecified";
    return userType
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
