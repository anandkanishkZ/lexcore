import { redirect } from "next/navigation";

/** Password changing moved into the Security tab of the profile page, so
 * there's no longer a separate screen for it. Kept as a redirect because
 * this URL may still be bookmarked or linked from an older email. */
export default function PasswordPage() {
    redirect("/admin/profile?tab=security");
}
