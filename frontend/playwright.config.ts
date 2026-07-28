import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a genuine stack: the real Express API (backed by a
 * throwaway in-memory MongoDB, see ../backend/scripts/e2e-server.ts) and a
 * real Next.js server. The API can't be stubbed at the browser level — the
 * console's pages are Server Components that fetch from Node, where
 * `page.route()` has no visibility.
 *
 * Both servers run on non-default ports so a `npm run dev` stack already
 * running on 3000/8089 is never disturbed, and `reuseExistingServer` is off
 * so a stale process from a previous run can't silently serve the tests.
 */
const API_PORT = process.env.E2E_API_PORT ?? "8099";
const WEB_PORT = process.env.E2E_WEB_PORT ?? "3100";

const API_URL = `http://127.0.0.1:${API_PORT}`;
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
    testDir: "./e2e",
    // Server Components mean a lot of the work is server-side rendering;
    // full parallelism across workers mostly contends on the single Next
    // dev server rather than going faster.
    workers: process.env.CI ? 1 : 2,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
    timeout: 45_000,
    expect: { timeout: 10_000 },

    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    projects: [
        // Signs in once and writes the session to disk; every other project
        // starts already authenticated instead of re-running the login form.
        { name: "setup", testMatch: /.*\.setup\.ts/ },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
            dependencies: ["setup"],
        },
    ],

    webServer: [
        {
            command: "npm run e2e:api",
            cwd: "../backend",
            url: `${API_URL}/api/v1/health`,
            reuseExistingServer: false,
            // The in-memory MongoDB binary can take a while to spin up the
            // first time it's used on a machine.
            timeout: 120_000,
            stdout: "pipe",
            stderr: "pipe",
            env: { E2E_API_PORT: API_PORT },
        },
        {
            // A production build, not `next dev`, on purpose. In dev the login
            // page compiles on first request and the form can be clicked
            // before React hydrates — the browser then submits it natively as
            // a GET, putting the credentials in the query string and never
            // calling the Server Action. `next start` serves an already-built,
            // already-hydrating page, so that race doesn't exist.
            command: `npx next build && npx next start --port ${WEB_PORT}`,
            url: BASE_URL,
            reuseExistingServer: false,
            // Covers a cold production build.
            timeout: 300_000,
            stdout: "pipe",
            stderr: "pipe",
            env: { NEXT_PUBLIC_API_URL: API_URL },
        },
    ],
});
