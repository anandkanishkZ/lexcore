import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

async function makeLinkedClientAndCase(adminToken: string) {
    const { token: clientToken, user: clientUser } = await createUserAndToken({
        userType: "client",
        role: "user",
        email: `share-client-${Date.now()}-${Math.random()}@lexcore.local`,
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
        .send({ title: "Shared file test case", type: "civil", status: "open", client: client._id.toString() });
    const caseId = created.body.data._id;

    return { clientToken, clientUser, client, caseId };
}

async function uploadFile(token: string, caseId: string, name = "contract.pdf") {
    const res = await request(app)
        .post(`/api/v1/documents?case=${caseId}`)
        .set("Authorization", `Bearer ${token}`)
        .attach("file", Buffer.from("%PDF-1.4 fake content"), name);
    return res.body.data._id as string;
}

describe("file sharing (DMS collaboration)", () => {
    it("a viewer share can download a file despite not being the case's client", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId);

        const { token: outsiderToken, user: outsider } = await createUserAndToken({
            userType: "client",
            email: `outsider-${Date.now()}@lexcore.local`,
        });

        // Before sharing, the outsider is rejected.
        const before = await request(app).get(`/api/v1/documents/${fileId}/download`).set("Authorization", `Bearer ${outsiderToken}`);
        expect(before.status).toBe(403);

        const share = await request(app)
            .post(`/api/v1/documents/${fileId}/share`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ email: outsider.email, role: "viewer" });
        expect(share.status).toBe(201);
        expect(share.body.data.role).toBe("viewer");

        const after = await request(app).get(`/api/v1/documents/${fileId}/download`).set("Authorization", `Bearer ${outsiderToken}`);
        expect(after.status).toBe(200);
    });

    it("only base case access (not a share recipient) can list or manage shares", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId);
        const { token: outsiderToken, user: outsider } = await createUserAndToken({ userType: "client" });

        await request(app)
            .post(`/api/v1/documents/${fileId}/share`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ email: outsider.email, role: "viewer" });

        const listAsOwner = await request(app).get(`/api/v1/documents/${fileId}/shares`).set("Authorization", `Bearer ${clientToken}`);
        expect(listAsOwner.status).toBe(200);
        expect(listAsOwner.body.data).toHaveLength(1);

        const listAsRecipient = await request(app)
            .get(`/api/v1/documents/${fileId}/shares`)
            .set("Authorization", `Bearer ${outsiderToken}`);
        expect(listAsRecipient.status).toBe(403);
    });

    it("revoking a share removes access", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId);
        const { token: outsiderToken, user: outsider } = await createUserAndToken({ userType: "client" });

        const share = await request(app)
            .post(`/api/v1/documents/${fileId}/share`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ email: outsider.email, role: "viewer" });
        const shareId = share.body.data._id;

        const revoked = await request(app)
            .delete(`/api/v1/documents/${fileId}/shares/${shareId}`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(revoked.status).toBe(200);

        const after = await request(app).get(`/api/v1/documents/${fileId}/download`).set("Authorization", `Bearer ${outsiderToken}`);
        expect(after.status).toBe(403);
    });

    it("re-sharing the same email updates the role instead of duplicating", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId);
        const email = `repeat-${Date.now()}@lexcore.local`;

        await request(app).post(`/api/v1/documents/${fileId}/share`).set("Authorization", `Bearer ${clientToken}`).send({ email, role: "viewer" });
        await request(app).post(`/api/v1/documents/${fileId}/share`).set("Authorization", `Bearer ${clientToken}`).send({ email, role: "editor" });

        const list = await request(app).get(`/api/v1/documents/${fileId}/shares`).set("Authorization", `Bearer ${clientToken}`);
        expect(list.body.data).toHaveLength(1);
        expect(list.body.data[0].role).toBe("editor");
    });
});

describe("file versioning (DMS collaboration)", () => {
    it("a viewer share cannot upload a new version", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId);
        const { token: viewerToken, user: viewer } = await createUserAndToken({ userType: "client" });

        await request(app)
            .post(`/api/v1/documents/${fileId}/share`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ email: viewer.email, role: "viewer" });

        const res = await request(app)
            .post(`/api/v1/documents/${fileId}/versions`)
            .set("Authorization", `Bearer ${viewerToken}`)
            .attach("file", Buffer.from("%PDF-1.4 v2 content"), "contract-v2.pdf");
        expect(res.status).toBe(403);
    });

    it("an editor share can upload a new version, and history records the prior one", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId, "original.pdf");
        const { token: editorToken, user: editor } = await createUserAndToken({ userType: "client" });

        await request(app)
            .post(`/api/v1/documents/${fileId}/share`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ email: editor.email, role: "editor" });

        const uploaded = await request(app)
            .post(`/api/v1/documents/${fileId}/versions`)
            .set("Authorization", `Bearer ${editorToken}`)
            .attach("file", Buffer.from("%PDF-1.4 v2 content, this is longer"), "revised.pdf");
        expect(uploaded.status).toBe(201);
        // The document's identity/name is stable across versions — only its
        // content changes, same as Drive/SharePoint versioning. The locally
        // uploaded filename ("revised.pdf") doesn't rename the document.
        expect(uploaded.body.data.name).toBe("original.pdf");

        const history = await request(app).get(`/api/v1/documents/${fileId}/versions`).set("Authorization", `Bearer ${clientToken}`);
        expect(history.status).toBe(200);
        expect(history.body.data).toHaveLength(1);
        expect(history.body.data[0].name).toBe("original.pdf");
        expect(history.body.data[0].versionNumber).toBe(1);

        // The main download endpoint now serves the new (current) content...
        const current = await request(app)
            .get(`/api/v1/documents/${fileId}/download`)
            .set("Authorization", `Bearer ${clientToken}`)
            .buffer(true)
            .parse((res, cb) => {
                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () => cb(null, Buffer.concat(chunks)));
            });
        expect(Buffer.from(current.body).toString()).toContain("v2 content, this is longer");

        // ...while the archived version still serves the original bytes.
        const versionId = history.body.data[0]._id;
        const old = await request(app)
            .get(`/api/v1/documents/${fileId}/versions/${versionId}/download`)
            .set("Authorization", `Bearer ${clientToken}`)
            .buffer(true)
            .parse((res, cb) => {
                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () => cb(null, Buffer.concat(chunks)));
            });
        expect(old.status).toBe(200);
        expect(Buffer.from(old.body).toString()).toContain("fake content");
    });

    it("uploading a second version increments the version number", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);
        const fileId = await uploadFile(clientToken, caseId);

        await request(app)
            .post(`/api/v1/documents/${fileId}/versions`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("file", Buffer.from("v2"), "v2.pdf");
        await request(app)
            .post(`/api/v1/documents/${fileId}/versions`)
            .set("Authorization", `Bearer ${clientToken}`)
            .attach("file", Buffer.from("v3"), "v3.pdf");

        const history = await request(app).get(`/api/v1/documents/${fileId}/versions`).set("Authorization", `Bearer ${clientToken}`);
        expect(history.body.data.map((v: any) => v.versionNumber)).toEqual([2, 1]);
    });
});
