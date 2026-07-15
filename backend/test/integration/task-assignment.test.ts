import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";

describe("task assignee validation", () => {
    it("rejects assigning a client as a task's assignee on create", async () => {
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const { user: clientUser } = await createUserAndToken({ userType: "client", role: "user" });

        const res = await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ title: "Bad Assignment", assignee: clientUser._id.toString() });

        expect(res.status).toBe(400);
    });

    it("rejects assigning a client as a task's assignee on update", async () => {
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const { user: clientUser } = await createUserAndToken({ userType: "client", role: "user" });

        const created = await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ title: "Reassign Test" });
        const taskId = created.body.data._id;

        const res = await request(app)
            .put(`/api/v1/tasks/${taskId}`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ assignee: clientUser._id.toString() });

        expect(res.status).toBe(400);
    });

    it("allows assigning a genuine staff member as a task's assignee", async () => {
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const { user: attorneyUser } = await createUserAndToken({ userType: "attorney", role: "user" });

        const res = await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ title: "Good Assignment", assignee: attorneyUser._id.toString() });

        expect(res.status).toBe(201);
        expect(res.body.data.assignee).toBe(attorneyUser._id.toString());
    });
});

describe("task mutation access scoping", () => {
    it("rejects a staff member editing another staff member's task on a case they're not assigned to", async () => {
        const { token: creatorToken, user: creator } = await createUserAndToken({ userType: "attorney" });
        const { token: otherToken } = await createUserAndToken({ userType: "attorney" });

        const created = await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${creatorToken}`)
            .send({ title: "Not yours", assignee: creator._id.toString() });
        const taskId = created.body.data._id;

        const res = await request(app)
            .put(`/api/v1/tasks/${taskId}`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ title: "Hijacked" });
        expect(res.status).toBe(403);
    });

    it("allows the task's assignee to edit it even if they didn't create it", async () => {
        const { token: creatorToken } = await createUserAndToken({ userType: "attorney" });
        const { token: assigneeToken, user: assignee } = await createUserAndToken({ userType: "paralegal" });

        const created = await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${creatorToken}`)
            .send({ title: "Assigned to someone else", assignee: assignee._id.toString() });

        const res = await request(app)
            .put(`/api/v1/tasks/${created.body.data._id}`)
            .set("Authorization", `Bearer ${assigneeToken}`)
            .send({ status: "in_progress" });
        expect(res.status).toBe(200);
    });

    it("allows an admin to edit any task regardless of assignment", async () => {
        const { token: creatorToken, user: creator } = await createUserAndToken({ userType: "attorney" });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });

        const created = await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${creatorToken}`)
            .send({ title: "Admin override", assignee: creator._id.toString() });

        const res = await request(app)
            .delete(`/api/v1/tasks/${created.body.data._id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });
});
