import { describe, it, expect } from "vitest";
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
