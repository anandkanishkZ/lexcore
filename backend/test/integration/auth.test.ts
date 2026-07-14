import request from "supertest";
import app from "../../src/app";

describe("auth", () => {
    it("registers a new client account", async () => {
        const res = await request(app).post("/api/v1/auth/register").send({
            firstName: "Jane",
            lastName: "Doe",
            email: "jane@example.com",
            password: "Password123!",
            userType: "client",
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe("jane@example.com");
        expect(res.body.data.password).toBeUndefined();
    });

    it("rejects a duplicate email", async () => {
        const payload = {
            firstName: "Jane",
            lastName: "Doe",
            email: "dupe@example.com",
            password: "Password123!",
            userType: "client",
        };
        await request(app).post("/api/v1/auth/register").send(payload);
        const res = await request(app).post("/api/v1/auth/register").send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("logs in with correct credentials and returns a token", async () => {
        await request(app).post("/api/v1/auth/register").send({
            firstName: "Jane",
            lastName: "Doe",
            email: "login@example.com",
            password: "Password123!",
            userType: "client",
        });

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "login@example.com", password: "Password123!" });

        expect(res.status).toBe(200);
        expect(res.body.data.token).toBeTruthy();
        expect(res.body.data.user.email).toBe("login@example.com");
    });

    it("rejects an invalid password with a generic message", async () => {
        await request(app).post("/api/v1/auth/register").send({
            firstName: "Jane",
            lastName: "Doe",
            email: "wrongpass@example.com",
            password: "Password123!",
            userType: "client",
        });

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "wrongpass@example.com", password: "WrongPassword!" });

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Invalid email or password");
    });

    it("rejects an unauthenticated request to a protected route", async () => {
        const res = await request(app).get("/api/v1/auth/me");
        expect(res.status).toBe(401);
    });
});
