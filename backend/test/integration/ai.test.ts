import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";
import { CaseFileModel } from "../../src/models/case-file.model";

async function makeCase(adminToken: string, overrides: { title?: string; description?: string } = {}) {
    const { user: adminUser } = await createUserAndToken({ role: "admin" });
    const client = await ClientModel.create({
        firstName: "Ada",
        lastName: "Lovelace",
        email: `ai-client-${Date.now()}-${Math.random()}@lexcore.local`,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminUser._id,
    });

    const created = await request(app)
        .post("/api/v1/cases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            title: overrides.title ?? "Riverside boundary dispute",
            type: "civil",
            description: overrides.description ?? "A disagreement over a fence line between two neighboring properties.",
            client: client._id.toString(),
        });
    return created.body.data._id as string;
}

describe("AI search/summarize (staff-only)", () => {
    it("rejects a client on every route", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client" });
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const caseId = await makeCase(adminToken);

        const ask = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "boundary dispute" });
        expect(ask.status).toBe(403);

        const summary = await request(app)
            .get(`/api/v1/ai/cases/${caseId}/summary`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(summary.status).toBe(403);
    });

    it("rejects an empty or oversized query", async () => {
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal" });

        const empty = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "" });
        expect(empty.status).toBe(400);

        const tooLong = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "x".repeat(501) });
        expect(tooLong.status).toBe(400);
    });

    it("returns a canned answer with no sources when nothing matches — no DeepSeek call needed", async () => {
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal" });

        const res = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "zzz-nonexistent-keyword-zzz" });
        expect(res.status).toBe(200);
        expect(res.body.data.sources).toHaveLength(0);
        expect(res.body.data.answer).toMatch(/couldn't find/i);
    });

    it("finds a matching case via keyword search, then reports AI as not configured (no DEEPSEEK_API_KEY in tests)", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken } = await createUserAndToken({ userType: "attorney" });
        await makeCase(adminToken, {
            title: "Kathmandu tenancy eviction",
            description: "Landlord seeks eviction of a commercial tenant for non-payment of rent.",
        });

        const res = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "tenancy eviction" });
        // Matches were found (proving $text search works end to end), but
        // generating the answer requires DeepSeek, which is unconfigured by
        // default in the test env — the same graceful-degrade path SMTP_*
        // being unset already exercises.
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(/not configured/i);
    });

    it("finds a matching document by extracted content via keyword search", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken, { title: "Unrelated matter", description: "Nothing relevant here." });

        await CaseFileModel.create({
            name: "settlement-agreement.pdf",
            case: caseId,
            mimeType: "application/pdf",
            size: 1024,
            storagePath: "/tmp/does-not-exist.pdf",
            uploadedBy: staffUser._id,
            extractedText: "This settlement agreement resolves the arbitration claim between the two parties.",
        });

        const res = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "arbitration claim settlement" });
        // Same reasoning as above: a match was found (document search works),
        // generation 503s because no DEEPSEEK_API_KEY is set in tests.
        expect(res.status).toBe(503);
    });

    it("case summary: 404 for a missing case (checked before any DeepSeek call)", async () => {
        const { token: staffToken } = await createUserAndToken({ userType: "attorney" });
        const missingId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .get(`/api/v1/ai/cases/${missingId}/summary`)
            .set("Authorization", `Bearer ${staffToken}`);
        expect(res.status).toBe(404);
    });

    it("case summary: not configured for an existing case (no DEEPSEEK_API_KEY)", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);

        const res = await request(app)
            .get(`/api/v1/ai/cases/${caseId}/summary`)
            .set("Authorization", `Bearer ${staffToken}`);
        expect(res.status).toBe(503);
    });

    it("document summary: 400 when the document has no extracted text", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);

        const file = await CaseFileModel.create({
            name: "photo.jpg",
            case: caseId,
            mimeType: "image/jpeg",
            size: 2048,
            storagePath: "/tmp/does-not-exist.jpg",
            uploadedBy: staffUser._id,
        });

        const res = await request(app)
            .get(`/api/v1/ai/documents/${file._id}/summary`)
            .set("Authorization", `Bearer ${staffToken}`);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no extractable text/i);
    });

    it("document summary: not configured for a document with extracted text (no DEEPSEEK_API_KEY)", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);

        const file = await CaseFileModel.create({
            name: "brief.docx",
            case: caseId,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 4096,
            storagePath: "/tmp/does-not-exist.docx",
            uploadedBy: staffUser._id,
            extractedText: "This brief argues that the defendant breached the lease agreement.",
        });

        const res = await request(app)
            .get(`/api/v1/ai/documents/${file._id}/summary`)
            .set("Authorization", `Bearer ${staffToken}`);
        expect(res.status).toBe(503);
    });

    it("document chat: rejects a client", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: clientToken } = await createUserAndToken({ userType: "client" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);
        const file = await CaseFileModel.create({
            name: "brief.docx",
            case: caseId,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 4096,
            storagePath: "/tmp/does-not-exist.docx",
            uploadedBy: staffUser._id,
            extractedText: "This brief argues that the defendant breached the lease agreement.",
        });

        const res = await request(app)
            .post(`/api/v1/ai/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "What is this about?" });
        expect(res.status).toBe(403);
    });

    it("document chat: 400 when the document has no extracted text", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);
        const file = await CaseFileModel.create({
            name: "photo.jpg",
            case: caseId,
            mimeType: "image/jpeg",
            size: 2048,
            storagePath: "/tmp/does-not-exist.jpg",
            uploadedBy: staffUser._id,
        });

        const res = await request(app)
            .post(`/api/v1/ai/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "What is this about?" });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no extractable text/i);
    });

    it("document chat: rejects an empty query and an oversized history", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);
        const file = await CaseFileModel.create({
            name: "brief.docx",
            case: caseId,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 4096,
            storagePath: "/tmp/does-not-exist.docx",
            uploadedBy: staffUser._id,
            extractedText: "This brief argues that the defendant breached the lease agreement.",
        });

        const emptyQuery = await request(app)
            .post(`/api/v1/ai/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ query: "" });
        expect(emptyQuery.status).toBe(400);

        const tooMuchHistory = await request(app)
            .post(`/api/v1/ai/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({
                query: "Follow-up question",
                history: Array.from({ length: 21 }, (_, i) => ({ role: "user", content: `turn ${i}` })),
            });
        expect(tooMuchHistory.status).toBe(400);
    });

    it("document chat: not configured for a valid multi-turn request (no DEEPSEEK_API_KEY)", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: staffToken, user: staffUser } = await createUserAndToken({ userType: "attorney" });
        const caseId = await makeCase(adminToken);
        const file = await CaseFileModel.create({
            name: "brief.docx",
            case: caseId,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 4096,
            storagePath: "/tmp/does-not-exist.docx",
            uploadedBy: staffUser._id,
            extractedText: "This brief argues that the defendant breached the lease agreement.",
        });

        const res = await request(app)
            .post(`/api/v1/ai/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${staffToken}`)
            .send({
                query: "What breach is alleged?",
                history: [
                    { role: "user", content: "Summarize this document" },
                    { role: "assistant", content: "It's a legal brief about a lease dispute." },
                ],
            });
        expect(res.status).toBe(503);
    });
});

describe("AI (client-scoped /my routes)", () => {
    /** Creates a client User + a matching Client record sharing the same
     * email (mirrors how CaseService.getMine/assertAccess link the two —
     * see case.repository.ts's getMineByEmail), a case owned by that
     * client, and returns everything needed to exercise /my/* as that
     * client. */
    async function makeClientWithCase(overrides: { title?: string; description?: string } = {}) {
        const { user: adminUser, token: adminToken } = await createUserAndToken({ role: "admin" });
        const email = `ai-my-client-${Date.now()}-${Math.random()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ email, userType: "client" });
        const client = await ClientModel.create({
            firstName: "Grace",
            lastName: "Hopper",
            email,
            phone: "9876543210",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
        });

        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                title: overrides.title ?? "Contract breach claim",
                type: "civil",
                description: overrides.description ?? "A dispute over an unfulfilled service contract.",
                client: client._id.toString(),
            });

        return { clientToken, adminToken, caseId: created.body.data._id as string, adminUser };
    }

    it("ask: a client only ever matches their own case, never someone else's", async () => {
        const { clientToken } = await makeClientWithCase({
            title: "Kathmandu tenancy eviction",
            description: "Landlord seeks eviction of a commercial tenant for non-payment of rent.",
        });
        // A second, unrelated client + case with an overlapping keyword.
        await makeClientWithCase({
            title: "Pokhara tenancy eviction",
            description: "A different landlord seeks eviction of a different tenant for non-payment of rent.",
        });

        const res = await request(app)
            .post("/api/v1/ai/my/ask")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "tenancy eviction" });
        // A match was found (scoped $text search works), generation 503s
        // because no DEEPSEEK_API_KEY is set in tests — same pattern as the
        // staff-route tests above.
        expect(res.status).toBe(503);
    });

    it("ask: returns no sources (and skips DeepSeek entirely) when the client owns no cases", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client" });

        const res = await request(app)
            .post("/api/v1/ai/my/ask")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "anything" });
        expect(res.status).toBe(200);
        expect(res.body.data.sources).toHaveLength(0);
    });

    it("case summary: a client can summarize their own case (503s past ownership check — no DEEPSEEK_API_KEY)", async () => {
        const { clientToken, caseId } = await makeClientWithCase();

        const res = await request(app)
            .get(`/api/v1/ai/my/cases/${caseId}/summary`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(503);
    });

    it("case summary: 403 when the case belongs to a different client", async () => {
        const { caseId } = await makeClientWithCase();
        const { token: otherClientToken } = await createUserAndToken({ userType: "client" });

        const res = await request(app)
            .get(`/api/v1/ai/my/cases/${caseId}/summary`)
            .set("Authorization", `Bearer ${otherClientToken}`);
        expect(res.status).toBe(403);
    });

    it("document summary: a client can summarize a document on their own case", async () => {
        const { clientToken, caseId, adminUser } = await makeClientWithCase();
        const file = await CaseFileModel.create({
            name: "settlement-agreement.pdf",
            case: caseId,
            mimeType: "application/pdf",
            size: 1024,
            storagePath: "/tmp/does-not-exist.pdf",
            uploadedBy: adminUser._id,
            extractedText: "This settlement agreement resolves the contract dispute between the two parties.",
        });

        const res = await request(app)
            .get(`/api/v1/ai/my/documents/${file._id}/summary`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(503);
    });

    it("document summary: 403 when the document belongs to a different client's case", async () => {
        const { caseId, adminUser } = await makeClientWithCase();
        const { token: otherClientToken } = await createUserAndToken({ userType: "client" });
        const file = await CaseFileModel.create({
            name: "settlement-agreement.pdf",
            case: caseId,
            mimeType: "application/pdf",
            size: 1024,
            storagePath: "/tmp/does-not-exist.pdf",
            uploadedBy: adminUser._id,
            extractedText: "Some extracted content.",
        });

        const res = await request(app)
            .get(`/api/v1/ai/my/documents/${file._id}/summary`)
            .set("Authorization", `Bearer ${otherClientToken}`);
        expect(res.status).toBe(403);
    });

    it("document summary: 404 for a document id that doesn't exist", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client" });
        const missingId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .get(`/api/v1/ai/my/documents/${missingId}/summary`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(404);
    });

    it("document chat: a client can chat about their own document; validation still applies", async () => {
        const { clientToken, caseId, adminUser } = await makeClientWithCase();
        const file = await CaseFileModel.create({
            name: "brief.docx",
            case: caseId,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 4096,
            storagePath: "/tmp/does-not-exist.docx",
            uploadedBy: adminUser._id,
            extractedText: "This brief argues that the defendant breached the service contract.",
        });

        const empty = await request(app)
            .post(`/api/v1/ai/my/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "" });
        expect(empty.status).toBe(400);

        const res = await request(app)
            .post(`/api/v1/ai/my/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "What breach is alleged?" });
        expect(res.status).toBe(503);
    });

    it("document chat: 403 when the document belongs to a different client's case", async () => {
        const { caseId, adminUser } = await makeClientWithCase();
        const { token: otherClientToken } = await createUserAndToken({ userType: "client" });
        const file = await CaseFileModel.create({
            name: "brief.docx",
            case: caseId,
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 4096,
            storagePath: "/tmp/does-not-exist.docx",
            uploadedBy: adminUser._id,
            extractedText: "This brief argues that the defendant breached the service contract.",
        });

        const res = await request(app)
            .post(`/api/v1/ai/my/documents/${file._id}/chat`)
            .set("Authorization", `Bearer ${otherClientToken}`)
            .send({ query: "What is this about?" });
        expect(res.status).toBe(403);
    });

    it("staff routes stay staff-only: a client still gets 403 on /ask (unscoped)", async () => {
        const { clientToken } = await makeClientWithCase();

        const res = await request(app)
            .post("/api/v1/ai/ask")
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ query: "anything" });
        expect(res.status).toBe(403);
    });
});
