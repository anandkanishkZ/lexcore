import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

async function makeClientRecord() {
    return ClientModel.create({
        firstName: "Acme",
        lastName: "Corp",
        email: `client-${Date.now()}-${Math.random()}@lexcore.local`,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: (await createUserAndToken({ role: "admin" })).user._id,
    });
}

describe("case-level assignedAttorney scoping", () => {
    it("lets any staff member create and list cases", async () => {
        const { token } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const client = await makeClientRecord();

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Test Case", type: "civil", status: "open", client: client._id.toString() });
        expect(created.status).toBe(201);

        const listed = await request(app).get("/api/v1/cases").set("Authorization", `Bearer ${token}`);
        expect(listed.status).toBe(200);
        expect(listed.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("blocks a non-admin staff member from editing a case they're not assigned to", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const client = await makeClientRecord();

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Unassigned Case", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        const res = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ status: "pending" });

        expect(res.status).toBe(403);
    });

    it("allows a staff member to edit a case once they're the assignedAttorney", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const client = await makeClientRecord();

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Assigned Case", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ assignedAttorney: staffUser._id.toString() });

        const res = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ status: "pending" });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("pending");
    });

    it("blocks a non-admin staff member from deleting a case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const client = await makeClientRecord();

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Delete Test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        const res = await request(app).delete(`/api/v1/cases/${caseId}`).set("Authorization", `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it("allows an admin to delete a case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const client = await makeClientRecord();

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Admin Delete Test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        const res = await request(app).delete(`/api/v1/cases/${caseId}`).set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });

    it("rejects assigning a client as a case's attorney on create", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { user: clientUser } = await createUserAndToken({ userType: "client", role: "user" });
        const client = await makeClientRecord();

        const res = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: "Bad Attorney Assignment",
                type: "civil",
                status: "open",
                client: client._id.toString(),
                assignedAttorney: clientUser._id.toString(),
            });

        expect(res.status).toBe(400);
    });

    it("rejects assigning a client as a case's attorney on update", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { user: clientUser } = await createUserAndToken({ userType: "client", role: "user" });
        const client = await makeClientRecord();

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Reassign Test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        const res = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ assignedAttorney: clientUser._id.toString() });

        expect(res.status).toBe(400);
    });
});
