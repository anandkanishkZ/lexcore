/**
 * Boots the real API against a throwaway in-memory MongoDB, seeded with a
 * known admin, for the frontend's Playwright suite to drive.
 *
 * Why the API can't just be mocked: the console is built from Next.js Server
 * Components, which fetch on the Node server rather than in the browser —
 * Playwright's `page.route()` never sees those requests, so stubbing them is
 * impossible. The E2E run needs a genuine API.
 *
 * Why in-memory rather than a real database: the same mongodb-memory-server
 * the Jest suite already uses means `npm run test:e2e` needs no MongoDB
 * installed, no connection string, and no cleanup — and it can never point at
 * a database anyone cares about, which a misconfigured MONGODB_URL otherwise
 * could.
 *
 * Env is set here, before any src/ module loads, because configs/constant.ts
 * reads process.env at import time.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = process.env.E2E_API_PORT ?? "8099";

export const E2E_ADMIN = {
    email: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@lexcore.test",
    password: process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin123",
    firstName: "Eva",
    lastName: "Tester",
} as const;

async function main() {
    const mongod = await MongoMemoryServer.create();

    process.env.MONGODB_URL = mongod.getUri();
    process.env.PORT = PORT;
    // Deterministic throwaway values — these never touch a real environment,
    // and constant.ts throws on startup if SECRET_KEY is missing.
    process.env.SECRET_KEY ??= "e2e-secret-key-not-for-production";
    process.env.ENCRYPTION_KEY ??= "0".repeat(64);
    process.env.CORS_ORIGIN ??= "http://127.0.0.1:3100,http://localhost:3100";
    // The backup and hearing-reminder schedulers are already no-ops unless
    // BACKUP_SCHEDULE_CRON / HEARING_REMINDER_CRON are set, so an E2E run
    // starts no background jobs without doing anything else here.

    // Imported only after env is in place (see file header).
    const bcryptjs = (await import("bcryptjs")).default;
    const { UserModel } = await import("../src/models/user.model");
    const mongoose = (await import("mongoose")).default;

    await mongoose.connect(process.env.MONGODB_URL);
    await UserModel.create({
        firstName: E2E_ADMIN.firstName,
        lastName: E2E_ADMIN.lastName,
        email: E2E_ADMIN.email,
        // Public registration is locked to userType "client" and role "user"
        // (CreateUserDTO), so an admin can only be made directly like this —
        // the same approach test/helpers.ts takes.
        userType: "attorney",
        role: "admin",
        isActive: true,
        password: await bcryptjs.hash(E2E_ADMIN.password, 4),
    });
    await mongoose.disconnect();

    // index.ts starts the server as a side effect of being imported.
    await import("../index");

    console.log(`[e2e] API on http://127.0.0.1:${PORT} — admin ${E2E_ADMIN.email}`);

    const shutdown = async () => {
        await mongod.stop();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}

main().catch((error) => {
    console.error("[e2e] failed to start API:", error);
    process.exit(1);
});
