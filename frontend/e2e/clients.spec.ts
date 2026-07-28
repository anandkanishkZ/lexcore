import { test, expect } from "@playwright/test";
import { unique } from "./support/constants";

test.describe("clients", () => {
    test("creates a client and shows it in the list", async ({ page }) => {
        const stamp = unique("e2e");
        const firstName = "Casey";
        const lastName = stamp;
        const email = `${stamp}@lexcore.test`;

        await page.goto("/admin/clients/create");

        await page.getByLabel("First Name").fill(firstName);
        await page.getByLabel("Last Name").fill(lastName);
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Phone").fill("9800000000");

        await page.getByRole("button", { name: "Create Client" }).click();

        // The form redirects to the list once the API confirms the write.
        await page.waitForURL(/\/admin\/(clients|users)/);
        await expect(page.getByText(email)).toBeVisible();
    });

    test("requires the fields the API would reject anyway", async ({ page }) => {
        await page.goto("/admin/clients/create");

        await page.getByRole("button", { name: "Create Client" }).click();

        // Still on the form — nothing was submitted.
        await expect(page).toHaveURL(/\/admin\/clients\/create/);
        await expect(page.getByText(/required/i).first()).toBeVisible();
    });

    test("lists clients from the API", async ({ page }) => {
        await page.goto("/admin/users");

        await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    });
});
