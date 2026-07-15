import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { UserModel } from "../../src/models/user.model";

describe("password management", () => {
    describe("PUT /auth/password (self-service change)", () => {
        it("changes the password when the current password is correct", async () => {
            const { token, user } = await createUserAndToken();

            const res = await request(app)
                .put("/api/v1/auth/password")
                .set("Authorization", `Bearer ${token}`)
                .send({ currentPassword: "Password123!", newPassword: "NewPassword456!" });
            expect(res.status).toBe(200);

            const login = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: user.email, password: "NewPassword456!" });
            expect(login.status).toBe(200);
        });

        it("rejects the change when the current password is wrong", async () => {
            const { token } = await createUserAndToken();

            const res = await request(app)
                .put("/api/v1/auth/password")
                .set("Authorization", `Bearer ${token}`)
                .send({ currentPassword: "WrongCurrent1", newPassword: "NewPassword456!" });
            expect(res.status).toBe(400);
        });

        it("rejects a weak new password", async () => {
            const { token } = await createUserAndToken();

            const res = await request(app)
                .put("/api/v1/auth/password")
                .set("Authorization", `Bearer ${token}`)
                .send({ currentPassword: "Password123!", newPassword: "short" });
            expect(res.status).toBe(400);
        });

        it("the generic profile-update endpoint can no longer set a password directly", async () => {
            const { token, user } = await createUserAndToken();

            const res = await request(app)
                .put("/api/v1/auth/update")
                .set("Authorization", `Bearer ${token}`)
                .send({ password: "SneakyChange1" });
            expect(res.status).toBe(200); // succeeds, but silently ignores the password field

            const login = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: user.email, password: "SneakyChange1" });
            expect(login.status).toBe(400); // the old password is still the real one
        });
    });

    describe("POST /auth/forgot-password + /auth/reset-password", () => {
        it("resets the password with a valid token and the new password works for login", async () => {
            const { user } = await createUserAndToken();

            // SMTP isn't configured in tests, so mail.util logs the message
            // (including the reset link) to the console instead of sending
            // it — capture that to get the same raw token a real user would
            // receive by email.
            const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
            const forgot = await request(app).post("/api/v1/auth/forgot-password").send({ email: user.email });
            expect(forgot.status).toBe(200);

            const emailed = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
            logSpy.mockRestore();
            const token = /reset-password\?token=([a-f0-9]+)/.exec(emailed)?.[1];
            expect(token).toBeTruthy();

            const updated = await UserModel.findById(user._id);
            expect(updated?.passwordResetTokenHash).toBeTruthy();

            const reset = await request(app)
                .post("/api/v1/auth/reset-password")
                .send({ token, newPassword: "NewPassword456!" });
            expect(reset.status).toBe(200);

            const login = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: user.email, password: "NewPassword456!" });
            expect(login.status).toBe(200);

            // The token is single-use — the same one can't be replayed.
            const replay = await request(app)
                .post("/api/v1/auth/reset-password")
                .send({ token, newPassword: "AnotherPassword789!" });
            expect(replay.status).toBe(400);
        });

        it("does not reveal whether an email is registered", async () => {
            const res = await request(app)
                .post("/api/v1/auth/forgot-password")
                .send({ email: "nobody-registered@lexcore.local" });
            expect(res.status).toBe(200);
        });

        it("rejects an expired or unknown reset token", async () => {
            const res = await request(app)
                .post("/api/v1/auth/reset-password")
                .send({ token: "totally-made-up", newPassword: "NewPassword456!" });
            expect(res.status).toBe(400);
        });
    });

    describe("account deactivation", () => {
        it("a deactivated account can no longer log in", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { user: staffUser } = await createUserAndToken({ userType: "paralegal" });

            const deactivate = await request(app)
                .patch(`/api/v1/admin/users/${staffUser._id}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ isActive: false });
            expect(deactivate.status).toBe(200);

            const login = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: staffUser.email, password: "Password123!" });
            expect(login.status).toBe(403);
        });

        it("an admin cannot deactivate their own account", async () => {
            const { token: adminToken, user: adminUser } = await createUserAndToken({ role: "admin" });

            const res = await request(app)
                .patch(`/api/v1/admin/users/${adminUser._id}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ isActive: false });
            expect(res.status).toBe(400);
        });
    });

    describe("email case-insensitivity", () => {
        it("logs in with a differently-cased email than the one used to register", async () => {
            await request(app).post("/api/v1/auth/register").send({
                firstName: "Case",
                lastName: "Sensitive",
                email: "MixedCase@Example.com",
                password: "Password123!",
                userType: "client",
            });

            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: "mixedcase@example.com", password: "Password123!" });
            expect(res.status).toBe(200);
        });

        it("rejects a duplicate registration that only differs by email casing", async () => {
            await request(app).post("/api/v1/auth/register").send({
                firstName: "First",
                lastName: "One",
                email: "duplicate-case@example.com",
                password: "Password123!",
                userType: "client",
            });

            const res = await request(app).post("/api/v1/auth/register").send({
                firstName: "Second",
                lastName: "One",
                email: "Duplicate-Case@Example.com",
                password: "Password123!",
                userType: "client",
            });
            expect(res.status).toBe(400);
        });
    });
});
