import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";
import { CaseModel } from "../../src/models/case.model";

describe("case request lifecycle (submit -> approve/reject)", () => {
    it("approves a request: creates a Client + Case and is not a regression of the populated-requestedBy bug", async () => {
        const { token: clientToken, user: clientUser } = await createUserAndToken({
            userType: "client",
            role: "user",
            email: "lifecycle-client@lexcore.local",
        });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });

        const submitted = await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Boundary dispute", type: "civil", description: "Neighbour built a fence over the line", phone: "9800000000" });
        expect(submitted.status).toBe(201);
        expect(submitted.body.data.status).toBe("pending");
        const requestId = submitted.body.data._id;

        // This call previously threw a 500 ("Cast to ObjectId failed...")
        // because CaseRequestService.approve() called .toString() on a
        // populated requestedBy subdocument instead of reading ._id off it.
        const approved = await request(app)
            .post(`/api/v1/case-requests/${requestId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(approved.status).toBe(200);
        expect(approved.body.data.status).toBe("approved");
        expect(approved.body.data.resultingCase).toBeTruthy();

        const client = await ClientModel.findOne({ email: clientUser.email });
        expect(client).not.toBeNull();
        expect(client!.phone).toBe("9800000000");
        expect(client!.linkedUserId?.toString()).toBe(clientUser._id.toString());

        const createdCase = await CaseModel.findById(approved.body.data.resultingCase._id);
        expect(createdCase).not.toBeNull();
        expect(createdCase!.title).toBe("Boundary dispute");
        expect(createdCase!.caseNumber).toMatch(/^CASE-\d{4}-\d{4}$/);
    });

    it("reuses an existing Client record on approval if one already exists for that email", async () => {
        const { token: clientToken, user: clientUser } = await createUserAndToken({
            userType: "client",
            role: "user",
            email: "existing-client@lexcore.local",
        });
        const { token: adminToken, user: adminUser } = await createUserAndToken({ role: "admin" });

        const existing = await ClientModel.create({
            firstName: "Existing",
            lastName: "Client",
            email: clientUser.email,
            phone: "1111111111",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
        });

        const submitted = await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Second matter", type: "other", description: "Another issue", phone: "9800000000" });

        const approved = await request(app)
            .post(`/api/v1/case-requests/${submitted.body.data._id}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(approved.status).toBe(200);
        const clientCount = await ClientModel.countDocuments({ email: clientUser.email });
        expect(clientCount).toBe(1);

        const createdCase = await CaseModel.findById(approved.body.data.resultingCase._id);
        expect(createdCase!.client.toString()).toBe(existing._id.toString());

        // The pre-existing Client record had no linkedUserId (it predates
        // that field, or was hand-created by an admin) — approval must
        // backfill it rather than leaving the requester and this contact as
        // two permanently-unrelated rows in the members directory.
        const reloaded = await ClientModel.findById(existing._id);
        expect(reloaded!.linkedUserId?.toString()).toBe(clientUser._id.toString());
    });

    it("rejects a request with a reason and does not create a case", async () => {
        const { token: clientToken } = await createUserAndToken({
            userType: "client",
            role: "user",
            email: "rejected-client@lexcore.local",
        });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });

        const submitted = await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Out of scope", type: "other", description: "Not something we handle", phone: "9800000000" });

        const rejected = await request(app)
            .post(`/api/v1/case-requests/${submitted.body.data._id}/reject`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ reviewNote: "Outside our practice areas" });

        expect(rejected.status).toBe(200);
        expect(rejected.body.data.status).toBe("rejected");
        expect(rejected.body.data.reviewNote).toBe("Outside our practice areas");
        expect(rejected.body.data.resultingCase).toBeFalsy();
    });

    it("rejects re-reviewing an already-decided request", async () => {
        const { token: clientToken } = await createUserAndToken({
            userType: "client",
            role: "user",
            email: "double-review@lexcore.local",
        });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });

        const submitted = await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ title: "Double review test", type: "other", description: "desc", phone: "9800000000" });

        await request(app)
            .post(`/api/v1/case-requests/${submitted.body.data._id}/reject`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ reviewNote: "First decision" });

        const second = await request(app)
            .post(`/api/v1/case-requests/${submitted.body.data._id}/approve`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(second.status).toBe(400);
    });

    it("a client only sees their own requests via /mine", async () => {
        const { token: clientAToken } = await createUserAndToken({
            userType: "client",
            role: "user",
            email: "client-a@lexcore.local",
        });
        const { token: clientBToken } = await createUserAndToken({
            userType: "client",
            role: "user",
            email: "client-b@lexcore.local",
        });

        await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientAToken}`)
            .send({ title: "A's matter", type: "other", description: "desc", phone: "1" });
        await request(app)
            .post("/api/v1/case-requests")
            .set("Authorization", `Bearer ${clientBToken}`)
            .send({ title: "B's matter", type: "other", description: "desc", phone: "2" });

        const mine = await request(app).get("/api/v1/case-requests/mine").set("Authorization", `Bearer ${clientAToken}`);
        expect(mine.status).toBe(200);
        expect(mine.body.data).toHaveLength(1);
        expect(mine.body.data[0].title).toBe("A's matter");
    });
});
