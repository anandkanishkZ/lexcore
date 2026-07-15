import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

async function makeLinkedClientAndCase(adminToken: string, assignedAttorneyId?: string) {
    const { token: clientToken, user: clientUser } = await createUserAndToken({
        userType: "client",
        role: "user",
        email: `att-client-${Date.now()}-${Math.random()}@lexcore.local`,
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
        .send({
            title: "Attachment thread",
            type: "civil",
            status: "open",
            client: client._id.toString(),
            assignedAttorney: assignedAttorneyId,
        });
    const caseId = created.body.data._id;

    return { clientToken, clientUser, client, caseId };
}

const TINY_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
);

describe("message attachments", () => {
    it("uploads an image with a caption and returns it on the created message", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .field("content", "Here's a photo")
            .attach("files", TINY_PNG, { filename: "evidence.png", contentType: "image/png" });

        expect(res.status).toBe(201);
        expect(res.body.data.content).toBe("Here's a photo");
        expect(res.body.data.attachments).toHaveLength(1);
        expect(res.body.data.attachments[0].kind).toBe("image");
        expect(res.body.data.attachments[0].originalName).toBe("evidence.png");
    });

    it("allows an attachment-only message with no caption", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("files", TINY_PNG, { filename: "no-caption.png", contentType: "image/png" });

        expect(res.status).toBe(201);
        expect(res.body.data.content).toBe("");
        expect(res.body.data.attachments).toHaveLength(1);
    });

    it("uploads multiple files onto a single message", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("files", TINY_PNG, { filename: "one.png", contentType: "image/png" })
            .attach("files", TINY_PNG, { filename: "two.png", contentType: "image/png" });

        expect(res.status).toBe(201);
        expect(res.body.data.attachments).toHaveLength(2);
    });

    it("rejects an unsupported file type", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("files", Buffer.from("MZ\x90\x00fake-exe"), { filename: "virus.exe", contentType: "application/x-msdownload" });

        expect(res.status).toBe(400);
    });

    it("rejects a client not on the case before any file is written", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);
        const { clientToken: otherClientToken } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${otherClientToken}`)
            .attach("files", TINY_PNG, { filename: "snoop.png", contentType: "image/png" });

        expect(res.status).toBe(403);
    });

    it("blocks attachment uploads on a closed case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        await request(app).put(`/api/v1/cases/${caseId}`).set("Authorization", `Bearer ${adminToken}`).send({ status: "closed" });

        const res = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("files", TINY_PNG, { filename: "too-late.png", contentType: "image/png" });

        expect(res.status).toBe(400);
    });

    it("lets a chat participant download an attachment, and denies a non-participant", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: attorneyToken, user: attorneyUser } = await createUserAndToken({
            userType: "attorney",
            role: "user",
        });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken, attorneyUser._id.toString());
        const { token: outsiderToken } = await createUserAndToken({ userType: "paralegal", role: "user" });

        const uploaded = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("files", TINY_PNG, { filename: "download-me.png", contentType: "image/png" });

        const messageId = uploaded.body.data._id;
        const attachmentId = uploaded.body.data.attachments[0]._id;

        const downloaded = await request(app)
            .get(`/api/v1/messages/${messageId}/attachments/${attachmentId}/download`)
            .set("Authorization", `Bearer ${attorneyToken}`);
        expect(downloaded.status).toBe(200);
        expect(downloaded.headers["content-type"]).toBe("image/png");

        const denied = await request(app)
            .get(`/api/v1/messages/${messageId}/attachments/${attachmentId}/download`)
            .set("Authorization", `Bearer ${outsiderToken}`);
        expect(denied.status).toBe(403);
    });

    it("404s a nonexistent attachment id on a real message", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const uploaded = await request(app)
            .post(`/api/v1/messages/attachments?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("files", TINY_PNG, { filename: "real.png", contentType: "image/png" });
        const messageId = uploaded.body.data._id;

        const res = await request(app)
            .get(`/api/v1/messages/${messageId}/attachments/000000000000000000000000/download`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(404);
    });
});
