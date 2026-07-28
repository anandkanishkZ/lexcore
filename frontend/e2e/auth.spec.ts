import { test, expect } from "@playwright/test";
import { ADMIN } from "./support/constants";

// These exercise the login form itself, so they must start signed out —
// the project-level storageState would otherwise bounce them straight to
// /admin via proxy.ts.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("authentication", () => {
    test("redirects an anonymous visitor to the login page", async ({ page }) => {
        await page.goto("/admin/clients");

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    });

    test("rejects an unknown email without revealing whether it exists", async ({ page }) => {
        await page.goto("/login");

        await page.getByPlaceholder("you@example.com").fill("nobody@lexcore.test");
        await page.locator('input[type="password"]').fill("WrongPassword123");
        await page.getByRole("button", { name: "Sign in" }).click();

        // The backend deliberately returns one generic message for both an
        // unknown email and a bad password.
        await expect(page.getByText("Invalid email or password")).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });

    test("rejects a valid email with the wrong password", async ({ page }) => {
        await page.goto("/login");

        await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
        await page.locator('input[type="password"]').fill("DefinitelyWrong123");
        await page.getByRole("button", { name: "Sign in" }).click();

        await expect(page.getByText("Invalid email or password")).toBeVisible();
    });

    test("validates the form before calling the API", async ({ page }) => {
        await page.goto("/login");

        // A valid email so the browser's own type="email" check passes and
        // submission actually reaches the resolver — the point here is that
        // the client-side schema rejects it before any request is made.
        await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
        await page.getByRole("button", { name: "Sign in" }).click();

        await expect(page.getByText("Password is required")).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });

    test("blocks a malformed email at the browser's own validation", async ({ page }) => {
        await page.goto("/login");

        await page.getByPlaceholder("you@example.com").fill("not-an-email");
        await page.locator('input[type="password"]').fill("Whatever123");
        await page.getByRole("button", { name: "Sign in" }).click();

        // type="email" means the browser refuses to submit at all, so the
        // form never even reaches the zod resolver.
        await expect(page).toHaveURL(/\/login/);
        await expect(
            page.locator('input[type="email"]:invalid')
        ).toHaveCount(1);
    });

    test("signs in and lands on the dashboard", async ({ page }) => {
        await page.goto("/login");

        await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
        await page.locator('input[type="password"]').fill(ADMIN.password);
        await page.getByRole("button", { name: "Sign in" }).click();

        await page.waitForURL("**/admin");
        await expect(
            page.getByRole("heading", { name: `Welcome back, ${ADMIN.firstName}` })
        ).toBeVisible();
    });

    test("signs out and can no longer reach a protected page", async ({ page }) => {
        await page.goto("/login");
        await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
        await page.locator('input[type="password"]').fill(ADMIN.password);
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL("**/admin");

        // The sign-out control lives behind the topbar's user menu.
        await page.getByRole("banner").getByRole("button").last().click();
        await page.getByRole("button", { name: "Sign out" }).click();

        await page.waitForURL("**/login");

        await page.goto("/admin");
        await expect(page).toHaveURL(/\/login/);
    });
});
