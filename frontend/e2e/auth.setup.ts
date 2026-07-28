import { test as setup, expect } from "@playwright/test";
import { ADMIN, STORAGE_STATE } from "./support/constants";

/**
 * Signs in through the real login form once per run and saves the resulting
 * cookie jar. Every other spec loads that state instead of repeating the
 * login, which keeps them focused on what they actually assert — and the
 * login form itself still gets covered directly by auth.spec.ts.
 */
setup("authenticate as the seeded admin", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // proxy.ts redirects an authenticated user away from /login, so landing
    // on /admin is proof the session cookie was actually set.
    await page.waitForURL("**/admin");
    await expect(
        page.getByRole("heading", { name: `Welcome back, ${ADMIN.firstName}` })
    ).toBeVisible();

    await page.context().storageState({ path: STORAGE_STATE });
});
