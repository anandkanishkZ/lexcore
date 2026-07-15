import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

async function makeClient(adminId: string) {
    return ClientModel.create({
        firstName: "Lifecycle",
        lastName: "Client",
        email: `lifecycle-client-${Date.now()}-${Math.random()}@lexcore.local`,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminId,
    });
}

describe("case lifecycle: closeDate, pending requests, delete guard", () => {
    it("stamps closeDate when closing and clears it when reopening", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Close/reopen test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;
        expect(created.body.data.closeDate).toBeFalsy();

        const closed = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "closed" });
        expect(closed.status).toBe(200);
        expect(closed.body.data.closeDate).toBeTruthy();

        const reopened = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "open" });
        expect(reopened.status).toBe(200);
        expect(reopened.body.data.closeDate).toBeFalsy();
    });

    it("blocks closing a case with a pending document request", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Blocked close test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });

        const res = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "closed" });
        expect(res.status).toBe(400);
    });

    it("notifies a newly assigned attorney on reassignment", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());
        const { token: attorneyToken, user: attorney } = await createUserAndToken({ userType: "attorney" });

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Reassign test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        const reassigned = await request(app)
            .put(`/api/v1/cases/${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ assignedAttorney: attorney._id.toString() });
        expect(reassigned.status).toBe(200);

        const notifications = await request(app)
            .get("/api/v1/notifications")
            .set("Authorization", `Bearer ${attorneyToken}`);
        const assignedNotice = notifications.body.data.notifications.find((n: any) => n.title === "Case assigned to you");
        expect(assignedNotice).toBeTruthy();
    });

    it("blocks deleting a case that still has linked data (e.g. a document request)", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Delete guard test", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });

        const res = await request(app).delete(`/api/v1/cases/${caseId}`).set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
    });

    it("allows deleting a case with no linked data", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Clean delete test", type: "civil", status: "open", client: client._id.toString() });

        const res = await request(app)
            .delete(`/api/v1/cases/${created.body.data._id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });
});
