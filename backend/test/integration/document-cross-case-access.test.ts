import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

// Regression coverage for the cross-case folder IDOR found in a full
// enterprise-readiness audit: a caller with access to their own case could
// pass ?folder=<id belonging to a different case> and either read that
// folder's name/breadcrumb (GET /documents) or plant a file under it
// (POST /documents), even though they have no access to the case it
// actually belongs to.

async function makeLinkedClientAndCase(adminToken: string, title: string) {
    const { token: clientToken, user: clientUser } = await createUserAndToken({
        userType: "client",
        role: "user",
        email: `xcase-client-${Date.now()}-${Math.random()}@lexcore.local`,
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
        .send({ title, type: "civil", status: "open", client: client._id.toString() });
    const caseId = created.body.data._id;

    return { clientToken, caseId };
}

describe("cross-case folder access", () => {
    it("rejects listing a case with another case's folder id (no metadata leak)", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken: aliceToken, caseId: aliceCaseId } = await makeLinkedClientAndCase(adminToken, "Alice's case");
        const { clientToken: bobToken, caseId: bobCaseId } = await makeLinkedClientAndCase(adminToken, "Bob's case");

        const bobFolder = await request(app)
            .post("/api/v1/documents/folders")
            .set("Authorization", `Bearer ${bobToken}`)
            .send({ case: bobCaseId, name: "Bob Secret Custody Records" });
        expect(bobFolder.status).toBe(201);
        const bobFolderId = bobFolder.body.data._id;

        // Alice has access to her own case, but not Bob's — passing his
        // folder id under her case id must not leak his folder's name.
        const res = await request(app)
            .get(`/api/v1/documents?case=${aliceCaseId}&folder=${bobFolderId}`)
            .set("Authorization", `Bearer ${aliceToken}`);
        expect(res.status).toBe(404);
        expect(JSON.stringify(res.body)).not.toContain("Bob Secret Custody Records");
    });

    it("rejects uploading into another case's folder id", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken: aliceToken, caseId: aliceCaseId } = await makeLinkedClientAndCase(adminToken, "Alice's case 2");
        const { clientToken: bobToken, caseId: bobCaseId } = await makeLinkedClientAndCase(adminToken, "Bob's case 2");

        const bobFolder = await request(app)
            .post("/api/v1/documents/folders")
            .set("Authorization", `Bearer ${bobToken}`)
            .send({ case: bobCaseId, name: "Bob's folder" });
        const bobFolderId = bobFolder.body.data._id;

        const res = await request(app)
            .post(`/api/v1/documents?case=${aliceCaseId}&folder=${bobFolderId}`)
            .set("Authorization", `Bearer ${aliceToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content"), "planted.pdf");
        expect(res.status).toBe(400);

        // Confirm nothing was planted into Bob's folder — his own listing is
        // still empty.
        const bobListing = await request(app)
            .get(`/api/v1/documents?case=${bobCaseId}&folder=${bobFolderId}`)
            .set("Authorization", `Bearer ${bobToken}`);
        expect(bobListing.body.data.files).toHaveLength(0);
    });
});
