/** Must match what ../backend/scripts/e2e-server.ts seeds. */
export const ADMIN = {
    email: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@lexcore.test",
    password: process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin123",
    firstName: "Eva",
    lastName: "Tester",
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    },
} as const;

export const STORAGE_STATE = "e2e/.auth/admin.json";

/** Keeps records created by a run distinguishable from each other — the
 * seeded database is shared across specs within a run, so a fixed name would
 * collide on a re-run of a single spec. */
export function unique(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
