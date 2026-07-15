import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

// Regression coverage for the "non-admin staff locked out of every document
// action" bug: CaseService.assertAccess used to be admin-or-client-only, so
// an attorney created the normal way (role: "user", userType: "attorney")
// got 403'd on Documents even for a case they were the assignedAttorney on.

async function makeCase(adminToken: string, adminId: string, assignedAttorney?: string) {
    const client = await ClientModel.create({
        firstName: "RBAC",
        lastName: "Test",
        email: `rbac-${Date.now()}-${Math.random()}@lexcore.local`,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminId,
    });
    const res = await request(app)
        .post("/api/v1/cases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "RBAC test case", type: "civil", status: "open", client: client._id.toString(), assignedAttorney });
    return res.body.data._id as string;
}

describe("document access — non-admin staff assigned to a case", () => {
    it("lets the assigned attorney list documents on their own case", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const { token: attorneyToken, user: attorney } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken, admin._id.toString(), attorney._id.toString());

        const res = await request(app)
            .get(`/api/v1/documents?case=${caseId}`)
            .set("Authorization", `Bearer ${attorneyToken}`);
        expect(res.status).toBe(200);
    });

    it("lets the assigned attorney upload a document to their own case", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const { token: attorneyToken, user: attorney } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken, admin._id.toString(), attorney._id.toString());

        const res = await request(app)
            .post(`/api/v1/documents?case=${caseId}`)
            .set("Authorization", `Bearer ${attorneyToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content"), "brief.pdf");
        expect(res.status).toBe(201);
    });

    it("still rejects a staff member who is NOT assigned to the case", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const { token: otherAttorneyToken } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken, admin._id.toString());

        const res = await request(app)
            .get(`/api/v1/documents?case=${caseId}`)
            .set("Authorization", `Bearer ${otherAttorneyToken}`);
        expect(res.status).toBe(403);
    });
});
