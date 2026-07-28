import { test, expect } from "@playwright/test";

/**
 * A smoke pass over every console route an admin can reach. These catch the
 * failure the unit and integration suites structurally cannot: a page that
 * throws during server rendering, or a Server Component whose data fetch
 * breaks, still compiles and still passes `next build` — it only blows up
 * when something actually requests it.
 */
const ROUTES: { path: string; heading: string }[] = [
    { path: "/admin", heading: "Dashboard" },
    { path: "/admin/users", heading: "Users" },
    { path: "/admin/clients/create", heading: "Add Client" },
    { path: "/admin/cases", heading: "Cases" },
    { path: "/admin/case-requests", heading: "Case Requests" },
    { path: "/admin/documents", heading: "Documents" },
    { path: "/admin/tasks", heading: "Tasks" },
    { path: "/admin/calendar", heading: "Calendar" },
    { path: "/admin/billing", heading: "Billing" },
    { path: "/admin/ai", heading: "AI Search" },
    { path: "/admin/reports", heading: "Reports" },
    { path: "/admin/settings", heading: "Firm Settings" },
    { path: "/admin/audit-log", heading: "Audit Log" },
    { path: "/admin/profile", heading: "My Profile" },
];

test.describe("console routes", () => {
    for (const { path, heading } of ROUTES) {
        test(`${path} renders without a server error`, async ({ page }) => {
            const failures: string[] = [];
            page.on("response", (response) => {
                if (response.status() >= 500) {
                    failures.push(`${response.status()} ${response.url()}`);
                }
            });

            await page.goto(path);

            // Scoped to the topbar: its title comes from
            // getPageTitle(pathname), so this asserts routing resolved as well
            // as that the page rendered. Some pages repeat the same title as
            // their own body heading, which is why this isn't page-wide.
            await expect(
                page.getByRole("banner").getByRole("heading", { name: heading, level: 1 })
            ).toBeVisible();
            expect(failures, `5xx responses on ${path}`).toEqual([]);
        });
    }

    test("the sidebar links to the main workspace sections", async ({ page }) => {
        await page.goto("/admin");

        const sidebar = page.getByRole("complementary");
        for (const label of ["Dashboard", "Users", "Cases", "Documents", "Billing"]) {
            await expect(sidebar.getByRole("link", { name: label })).toBeVisible();
        }
    });

    test("navigating by sidebar link changes the page", async ({ page }) => {
        await page.goto("/admin");

        await page.getByRole("complementary").getByRole("link", { name: "Cases" }).click();

        await page.waitForURL("**/admin/cases");
        await expect(
            page.getByRole("banner").getByRole("heading", { name: "Cases", level: 1 })
        ).toBeVisible();
    });
});
