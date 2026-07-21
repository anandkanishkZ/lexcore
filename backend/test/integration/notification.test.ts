import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { DeviceTokenModel } from "../../src/models/device-token.model";

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

    describe("device tokens", () => {
        it("registers a device token for the signed-in user", async () => {
            const { user, token } = await createUserAndToken();

            const res = await request(app)
                .post("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${token}`)
                .send({ token: "fcm-token-1", platform: "android" });

            expect(res.status).toBe(200);
            const saved = await DeviceTokenModel.findOne({ token: "fcm-token-1" });
            expect(saved).not.toBeNull();
            expect(saved!.user.toString()).toBe(user._id.toString());
            expect(saved!.platform).toBe("android");
        });

        it("re-registering the same token upserts rather than duplicating", async () => {
            const { user: firstUser, token: firstToken } = await createUserAndToken();
            const { user: secondUser, token: secondToken } = await createUserAndToken();

            await request(app)
                .post("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${firstToken}`)
                .send({ token: "shared-device", platform: "ios" });

            // Simulates a device shared across accounts (logout + different login) —
            // the second registration should reassign ownership, not create a second row.
            await request(app)
                .post("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${secondToken}`)
                .send({ token: "shared-device", platform: "ios" });

            const rows = await DeviceTokenModel.find({ token: "shared-device" });
            expect(rows).toHaveLength(1);
            expect(rows[0].user.toString()).toBe(secondUser._id.toString());
            expect(rows[0].user.toString()).not.toBe(firstUser._id.toString());
        });

        it("rejects registration with an invalid platform", async () => {
            const { token } = await createUserAndToken();

            const res = await request(app)
                .post("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${token}`)
                .send({ token: "bad-platform-token", platform: "windows" });

            expect(res.status).toBe(400);
            expect(await DeviceTokenModel.findOne({ token: "bad-platform-token" })).toBeNull();
        });

        it("rejects registration with a missing token", async () => {
            const { token } = await createUserAndToken();

            const res = await request(app)
                .post("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${token}`)
                .send({ platform: "android" });

            expect(res.status).toBe(400);
        });

        it("requires authentication to register a device token", async () => {
            const res = await request(app)
                .post("/api/v1/notifications/device-token")
                .send({ token: "no-auth-token", platform: "android" });

            expect(res.status).toBe(401);
        });

        it("unregisters a device token", async () => {
            const { token } = await createUserAndToken();

            await request(app)
                .post("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${token}`)
                .send({ token: "to-be-removed", platform: "android" });

            const res = await request(app)
                .delete("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${token}`)
                .send({ token: "to-be-removed" });

            expect(res.status).toBe(200);
            expect(await DeviceTokenModel.findOne({ token: "to-be-removed" })).toBeNull();
        });

        it("unregistering an unknown token is a no-op, not an error", async () => {
            const { token } = await createUserAndToken();

            const res = await request(app)
                .delete("/api/v1/notifications/device-token")
                .set("Authorization", `Bearer ${token}`)
                .send({ token: "never-registered" });

            expect(res.status).toBe(200);
        });
    });
});
