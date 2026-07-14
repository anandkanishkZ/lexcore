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
