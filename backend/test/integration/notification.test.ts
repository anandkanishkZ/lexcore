import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";

describe("notifications", () => {
    it("notifies admins when a case request is submitted", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });

        await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Notify test", type: "other", description: "desc", phone: "1" });

        const res = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.unread).toBeGreaterThanOrEqual(1);
        expect(res.body.data.notifications[0].title).toBe("New case request");
    });

    it("marks a single notification read", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });

        await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Mark read test", type: "other", description: "desc", phone: "1" });

        const before = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`);
        const id = before.body.data.notifications[0]._id;

        const marked = await request(app)
            .patch(`/api/v1/notifications/${id}/read`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(marked.status).toBe(200);
        expect(marked.body.data.isRead).toBe(true);
    });

    it("a user cannot mark another user's notification as read", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: otherAdminToken } = await createUserAndToken({ role: "admin" });

        await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Cross-user test", type: "other", description: "desc", phone: "1" });

        const before = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`);
        const id = before.body.data.notifications[0]._id;

        const marked = await request(app)
            .patch(`/api/v1/notifications/${id}/read`)
            .set("Authorization", `Bearer ${otherAdminToken}`);
        // Scoped to req.user in the query, so it just finds nothing to update.
        expect(marked.body.data).toBeNull();

        const stillUnread = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${adminToken}`);
        expect(stillUnread.body.data.unread).toBeGreaterThanOrEqual(1);
    });
});
