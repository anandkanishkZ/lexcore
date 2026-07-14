import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

async function makeLinkedClientAndCase(adminToken: string) {
    const { token: clientToken, user: clientUser } = await createUserAndToken({
        userType: "client",
        role: "user",
        email: `docreq-client-${Date.now()}-${Math.random()}@lexcore.local`,
    });
    const { user: adminUser } = await createUserAndToken({ role: "admin" });
    const client = await ClientModel.create({
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        email: clientUser.email,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminUser._id,
        linkedUserId: clientUser._id,
    });

    const created = await request(app)
        .post("/api/v1/cases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Boundary dispute", type: "civil", status: "open", client: client._id.toString() });
    const caseId = created.body.data._id;

    return { clientToken, clientUser, client, caseId };
}

describe("document requests (staff asks, client fulfills)", () => {
    it("staff creates a request; the owning client sees it via /mine", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID", description: "A government-issued photo ID" });
        expect(created.status).toBe(201);
        expect(created.body.data.status).toBe("pending");

        const mine = await request(app)
            .get("/api/v1/document-requests/mine")
            .set("Authorization", `Bearer ${clientToken}`);
        expect(mine.status).toBe(200);
        expect(mine.body.data).toHaveLength(1);
        expect(mine.body.data[0].title).toBe("Proof of ID");
    });

    it("a client not on the case sees no requests for it", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);
        const { clientToken: otherClientToken } = await makeLinkedClientAndCase(adminToken);

        await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });

        const mine = await request(app)
            .get("/api/v1/document-requests/mine")
            .set("Authorization", `Bearer ${otherClientToken}`);
        expect(mine.status).toBe(200);
        expect(mine.body.data).toHaveLength(0);
    });

    it("client uploads via the existing documents endpoint, then fulfills the request", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        const requestId = created.body.data._id;

        const uploaded = await request(app)
            .post(`/api/v1/documents?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content"), "id-proof.pdf");
        expect(uploaded.status).toBe(201);
        const fileId = uploaded.body.data._id;

        const fulfilled = await request(app)
            .post(`/api/v1/document-requests/${requestId}/fulfill`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ file: fileId });
        expect(fulfilled.status).toBe(200);
        expect(fulfilled.body.data.status).toBe("fulfilled");
        expect(fulfilled.body.data.fulfilledFile._id).toBe(fileId);
    });

    it("rejects fulfillment from a client who doesn't own the case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const { clientToken: otherClientToken } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        const requestId = created.body.data._id;

        const uploaded = await request(app)
            .post(`/api/v1/documents?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content"), "id-proof.pdf");
        const fileId = uploaded.body.data._id;

        const fulfilled = await request(app)
            .post(`/api/v1/document-requests/${requestId}/fulfill`)
            .set("Authorization", `Bearer ${otherClientToken}`)
            .send({ file: fileId });
        expect(fulfilled.status).toBe(403);
    });

    it("rejects fulfilling an already-fulfilled request", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        const requestId = created.body.data._id;

        const uploaded = await request(app)
            .post(`/api/v1/documents?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content"), "id-proof.pdf");
        const fileId = uploaded.body.data._id;

        await request(app)
            .post(`/api/v1/document-requests/${requestId}/fulfill`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ file: fileId });

        const secondAttempt = await request(app)
            .post(`/api/v1/document-requests/${requestId}/fulfill`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ file: fileId });
        expect(secondAttempt.status).toBe(400);
    });

    it("rejects a file that belongs to a different case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const { clientToken: otherClientToken, caseId: otherCaseId } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        const requestId = created.body.data._id;

        const uploadedElsewhere = await request(app)
            .post(`/api/v1/documents?case=${otherCaseId}`)
            .set("Authorization", `Bearer ${otherClientToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content"), "wrong-case.pdf");
        const wrongFileId = uploadedElsewhere.body.data._id;

        const fulfilled = await request(app)
            .post(`/api/v1/document-requests/${requestId}/fulfill`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ file: wrongFileId });
        expect(fulfilled.status).toBe(400);
    });

    it("staff can cancel a pending request; cancelling twice is rejected", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        const requestId = created.body.data._id;

        const cancelled = await request(app)
            .post(`/api/v1/document-requests/${requestId}/cancel`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(cancelled.status).toBe(200);
        expect(cancelled.body.data.status).toBe("cancelled");

        const secondCancel = await request(app)
            .post(`/api/v1/document-requests/${requestId}/cancel`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(secondCancel.status).toBe(400);
    });

    it("blocks a client from creating a document request", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        expect(res.status).toBe(403);
    });

    it("a non-admin staff member can create, list, and cancel requests", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);

        const created = await request(app)
            .post("/api/v1/document-requests")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ case: caseId, title: "Proof of ID" });
        expect(created.status).toBe(201);

        const listed = await request(app)
            .get(`/api/v1/document-requests?case=${caseId}`)
            .set("Authorization", `Bearer ${staffToken}`);
        expect(listed.status).toBe(200);
        expect(listed.body.data).toHaveLength(1);

        const cancelled = await request(app)
            .post(`/api/v1/document-requests/${created.body.data._id}/cancel`)
            .set("Authorization", `Bearer ${staffToken}`);
        expect(cancelled.status).toBe(200);
    });
});
