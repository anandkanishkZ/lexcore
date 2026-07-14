import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";

describe("RBAC — staff vs admin vs client boundaries", () => {
    it("rejects a client on a staff-only route", async () => {
        const { token } = await createUserAndToken({ userType: "client", role: "user" });
        const res = await request(app).get("/api/v1/tasks").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it("allows a non-admin staff member on a staff-only route", async () => {
        const { token } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const res = await request(app).get("/api/v1/tasks").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    it("rejects non-admin staff on an admin-only route", async () => {
        const { token } = await createUserAndToken({ userType: "attorney", role: "user" });
        const res = await request(app)
            .put("/api/v1/settings/firm")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Hacked" });
        expect(res.status).toBe(403);
    });

    it("allows an admin on an admin-only route", async () => {
        const { token } = await createUserAndToken({ userType: "attorney", role: "admin" });
        const res = await request(app)
            .put("/api/v1/settings/firm")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Lexcore" });
        expect(res.status).toBe(200);
    });

    it("rejects a request with no token at all", async () => {
        const res = await request(app).get("/api/v1/tasks");
        expect(res.status).toBe(401);
    });

    it("rejects a request with a malformed token", async () => {
        const res = await request(app).get("/api/v1/tasks").set("Authorization", "Bearer not-a-real-token");
        expect(res.status).toBe(401);
    });
});
