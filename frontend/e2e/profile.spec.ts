import { test, expect } from "@playwright/test";
import { ADMIN, unique } from "./support/constants";

test.describe("profile", () => {
    test("shows the signed-in user's identity and account details", async ({ page }) => {
        await page.goto("/admin/profile");

        await expect(page.getByRole("heading", { name: ADMIN.fullName })).toBeVisible();
        await expect(page.getByText(ADMIN.email).first()).toBeVisible();

        // Seeded as role "admin", userType "attorney".
        await expect(page.getByText("Administrator").first()).toBeVisible();
        await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
        await expect(page.getByText("Member since")).toBeVisible();
    });

    test("switches between the Personal Information and Security tabs", async ({ page }) => {
        await page.goto("/admin/profile");

        await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();

        await page.getByRole("tab", { name: "Security" }).click();
        await expect(page.getByRole("heading", { name: "Password" })).toBeVisible();
        await expect(page.getByLabel("Current password")).toBeVisible();

        await page.getByRole("tab", { name: "Personal Information" }).click();
        await expect(page.getByLabel("First name")).toBeVisible();
    });

    test("opens straight to Security when deep-linked", async ({ page }) => {
        await page.goto("/admin/profile?tab=security");

        await expect(page.getByRole("heading", { name: "Password" })).toBeVisible();
    });

    test("redirects the retired password page into the Security tab", async ({ page }) => {
        await page.goto("/admin/profile/password");

        await expect(page).toHaveURL(/\/admin\/profile\?tab=security/);
        await expect(page.getByRole("heading", { name: "Password" })).toBeVisible();
    });

    test("keeps Save disabled until something actually changes", async ({ page }) => {
        await page.goto("/admin/profile");

        const save = page.getByRole("button", { name: "Save changes" });
        await expect(save).toBeDisabled();

        await page.getByLabel("First name").fill("Changed");
        await expect(save).toBeEnabled();
        await expect(page.getByText("You have unsaved changes")).toBeVisible();
    });

    test("saves a profile change and reflects it immediately", async ({ page }) => {
        await page.goto("/admin/profile");

        const newLastName = unique("Tester");
        await page.getByLabel("Last name").fill(newLastName);
        await page.getByRole("button", { name: "Save changes" }).click();

        await expect(page.getByText("Your profile has been updated.")).toBeVisible();
        await expect(
            page.getByRole("heading", { name: `${ADMIN.firstName} ${newLastName}` })
        ).toBeVisible();
        // Saving re-baselines the form, so there is nothing left to submit.
        await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();

        // Put the seeded name back so the rest of the suite sees the fixture
        // it expects regardless of which order specs run in.
        await page.getByLabel("Last name").fill(ADMIN.lastName);
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByRole("heading", { name: ADMIN.fullName })).toBeVisible();
    });

    test("shows the password rules and catches a mismatched confirmation", async ({ page }) => {
        await page.goto("/admin/profile?tab=security");

        await page.getByLabel("Current password").fill(ADMIN.password);
        await page.getByLabel("New password", { exact: true }).fill("short");
        await page.getByLabel("Confirm new password").fill("different");
        await page.getByRole("button", { name: "Change password" }).click();

        await expect(page.getByText("Passwords do not match")).toBeVisible();
        // Exact, because the zod error ("New password must be at least 8
        // characters") also contains the checklist item's wording.
        await expect(page.getByText("At least 8 characters", { exact: true })).toBeVisible();
        await expect(page.getByText("Contains a number", { exact: true })).toBeVisible();
    });

    test("rejects a wrong current password at the API", async ({ page }) => {
        await page.goto("/admin/profile?tab=security");

        const next = "BrandNewPass123";
        await page.getByLabel("Current password").fill("NotMyPassword123");
        await page.getByLabel("New password", { exact: true }).fill(next);
        await page.getByLabel("Confirm new password").fill(next);
        await page.getByRole("button", { name: "Change password" }).click();

        // Surfaced from the backend, not guessed client-side.
        await expect(page.getByText(/incorrect|invalid|wrong/i).first()).toBeVisible();
    });

    test("reveals a typed password on demand", async ({ page }) => {
        await page.goto("/admin/profile?tab=security");

        const field = page.getByLabel("Current password");
        await field.fill("visible-check");
        await expect(field).toHaveAttribute("type", "password");

        await page.getByRole("button", { name: "Show password" }).first().click();
        await expect(field).toHaveAttribute("type", "text");
    });
});
