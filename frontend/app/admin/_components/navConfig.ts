import {
    LayoutDashboard,
    Users,
    Briefcase,
    FolderOpen,
    CalendarDays,
    Receipt,
    Settings,
    type LucideIcon,
} from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    soon?: boolean;
    /** Additional path prefixes that should also mark this item active. */
    matchPrefixes?: string[];
}

export interface NavSection {
    label: string;
    items: NavItem[];
}

export const navSections: NavSection[] = [
    {
        label: "Overview",
        items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
    },
    {
        label: "Workspace",
        items: [
            {
                label: "Users",
                href: "/admin/users",
                icon: Users,
                matchPrefixes: ["/admin/clients"],
            },
            { label: "Cases", href: "/admin/cases", icon: Briefcase },
            { label: "Documents", href: "/admin/documents", icon: FolderOpen, soon: true },
            { label: "Calendar", href: "/admin/calendar", icon: CalendarDays, soon: true },
            { label: "Billing", href: "/admin/billing", icon: Receipt, soon: true },
        ],
    },
    {
        label: "Administration",
        items: [{ label: "Firm Settings", href: "/admin/settings", icon: Settings, soon: true }],
    },
];

export function getPageTitle(pathname: string): string {
    if (pathname === "/admin") return "Dashboard";
    if (pathname === "/admin/users") return "Users";
    if (pathname === "/admin/clients") return "Clients";
    if (pathname === "/admin/clients/create") return "Add Client";
    if (pathname.match(/^\/admin\/clients\/[^/]+\/edit$/)) return "Edit Client";
    if (pathname.match(/^\/admin\/clients\/[^/]+$/)) return "Client Details";
    if (pathname === "/admin/cases") return "Cases";
    if (pathname === "/admin/cases/create") return "New Case";
    if (pathname.match(/^\/admin\/cases\/[^/]+\/edit$/)) return "Edit Case";
    if (pathname.match(/^\/admin\/cases\/[^/]+$/)) return "Case Details";
    if (pathname === "/admin/profile") return "Profile Settings";
    if (pathname === "/admin/profile/password") return "Change Password";
    return "Admin Panel";
}
