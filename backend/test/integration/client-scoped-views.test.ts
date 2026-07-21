import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

// Covers the staff-facing "everything about this client" endpoints added for
// the admin client-detail page: GET /tasks?client=, GET /documents/client/:id.
// (GET /messages/client/:id has its own coverage in message.test.ts,
// alongside the rest of that file's chat-access tests.)

async function makeClientWithCase(adminToken: string, title: string) {
    const { user: adminUser } = await createUserAndToken({ role: "admin" });
    const client = await ClientModel.create({
        firstName: "Cross",
        lastName: "Scoped",
        email: `cross-scoped-${Date.now()}-${Math.random()}@lexcore.local`,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminUser._id,
    });

    const created = await request(app)
        .post("/api/v1/cases")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title, type: "civil", status: "open", client: client._id.toString() });
    const caseId = created.body.data._id;

    return { client, caseId };
}

describe("GET /tasks?client= (staff-facing, cross-case)", () => {
    it("returns every task across all of a client's cases", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { client, caseId: firstCaseId } = await makeClientWithCase(adminToken, "First matter");

        const secondCase = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Second matter", type: "civil", status: "open", client: client._id.toString() });
        const secondCaseId = secondCase.body.data._id;

        await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Task on case one", case: firstCaseId });
        await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Task on case two", case: secondCaseId });
        await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Unrelated firm-wide task" });

        const res = await request(app)
            .get(`/api/v1/tasks?client=${client._id.toString()}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        const titles = res.body.data.map((t: any) => t.title).sort();
        expect(titles).toEqual(["Task on case one", "Task on case two"]);
    });

    it("still applies status alongside client", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { client, caseId } = await makeClientWithCase(adminToken, "Status filter matter");

        await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Todo task", case: caseId, status: "todo" });
        await request(app)
            .post("/api/v1/tasks")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Done task", case: caseId, status: "done" });

        const res = await request(app)
            .get(`/api/v1/tasks?client=${client._id.toString()}&status=done`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Done task");
    });

    it("returns an empty list for a client with no cases", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { user: adminUser } = await createUserAndToken({ role: "admin" });
        const client = await ClientModel.create({
            firstName: "No",
            lastName: "Cases",
            email: `no-cases-tasks-${Date.now()}@lexcore.local`,
            phone: "1234567890",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
        });

        const res = await request(app)
            .get(`/api/v1/tasks?client=${client._id.toString()}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("a client (non-staff) is rejected", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const { client } = await makeClientWithCase(adminToken, "Rejection matter");

        const res = await request(app)
            .get(`/api/v1/tasks?client=${client._id.toString()}`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(403);
    });
});

describe("GET /documents/client/:clientId (staff-facing, cross-case)", () => {
    it("returns every document across all of a client's cases", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { client, caseId: firstCaseId } = await makeClientWithCase(adminToken, "Docs matter one");

        const secondCase = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Docs matter two", type: "civil", status: "open", client: client._id.toString() });
        const secondCaseId = secondCase.body.data._id;

        await request(app)
            .post(`/api/v1/documents?case=${firstCaseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content one"), "one.pdf");
        await request(app)
            .post(`/api/v1/documents?case=${secondCaseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .attach("file", Buffer.from("%PDF-1.4 fake content two"), "two.pdf");

        const res = await request(app)
            .get(`/api/v1/documents/client/${client._id.toString()}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
    });

    it("returns an empty list for a client with no cases", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { user: adminUser } = await createUserAndToken({ role: "admin" });
        const client = await ClientModel.create({
            firstName: "No",
            lastName: "Cases",
            email: `no-cases-docs-${Date.now()}@lexcore.local`,
            phone: "1234567890",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
        });

        const res = await request(app)
            .get(`/api/v1/documents/client/${client._id.toString()}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("a client (non-staff) is rejected", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const { client } = await makeClientWithCase(adminToken, "Docs rejection matter");

        const res = await request(app)
            .get(`/api/v1/documents/client/${client._id.toString()}`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(403);
    });
});
