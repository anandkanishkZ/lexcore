import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";
import { NotificationModel } from "../../src/models/notification.model";

async function makeLinkedClientAndCase(adminToken: string, assignedAttorneyId?: string) {
    const { token: clientToken, user: clientUser } = await createUserAndToken({
        userType: "client",
        role: "user",
        email: `msg-client-${Date.now()}-${Math.random()}@lexcore.local`,
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
            title: "Boundary dispute",
            type: "civil",
            status: "open",
            client: client._id.toString(),
            assignedAttorney: assignedAttorneyId,
        });
    const caseId = created.body.data._id;

    return { clientToken, clientUser, client, caseId };
}

describe("case messaging (client <-> assigned staff)", () => {
    it("the client can send a message and see history", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const sent = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "Hello, I have a question about my case." });
        expect(sent.status).toBe(201);
        expect(sent.body.data.content).toBe("Hello, I have a question about my case.");

        const history = await request(app)
            .get(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(history.status).toBe(200);
        expect(history.body.data).toHaveLength(1);
    });

    it("a client not on the case is rejected", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);
        const { clientToken: otherClientToken } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${otherClientToken}`)
            .send({ content: "Trying to snoop" });
        expect(res.status).toBe(403);
    });

    it("the case's assigned attorney can send and read messages", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: attorneyToken, user: attorneyUser } = await createUserAndToken({
            userType: "attorney",
            role: "user",
        });
        const { caseId } = await makeLinkedClientAndCase(adminToken, attorneyUser._id.toString());

        const sent = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${attorneyToken}`)
            .send({ content: "Following up on your question." });
        expect(sent.status).toBe(201);

        const history = await request(app)
            .get(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${attorneyToken}`);
        expect(history.status).toBe(200);
        expect(history.body.data).toHaveLength(1);
    });

    it("an unrelated staff member (not assigned, not admin) is rejected", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: otherStaffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${otherStaffToken}`)
            .send({ content: "I shouldn't be able to send this" });
        expect(res.status).toBe(403);
    });

    it("an admin can always access the thread regardless of assignment", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { caseId } = await makeLinkedClientAndCase(adminToken);

        const sent = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ content: "Admin checking in" });
        expect(sent.status).toBe(201);
    });

    it("sending a message to an offline recipient creates a notification for them", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: attorneyToken, user: attorneyUser } = await createUserAndToken({
            userType: "attorney",
            role: "user",
        });
        const { clientToken, clientUser, caseId } = await makeLinkedClientAndCase(
            adminToken,
            attorneyUser._id.toString()
        );

        await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "Are you there?" });

        // No socket connections exist in this test (REST-only), so the
        // recipient (the assigned attorney) is always "offline" here.
        const attorneyNotifications = await NotificationModel.find({ user: attorneyUser._id });
        expect(attorneyNotifications.length).toBeGreaterThanOrEqual(1);
        expect(attorneyNotifications[0]?.title).toBe("New message");

        // And the reverse direction notifies the client.
        await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${attorneyToken}`)
            .send({ content: "Yes, how can I help?" });

        const clientNotifications = await NotificationModel.find({ user: clientUser._id });
        expect(clientNotifications.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects an empty message", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "" });
        expect(res.status).toBe(400);
    });

    it("rejects a whitespace-only message", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        const res = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "    \t  " });
        expect(res.status).toBe(400);
    });

    it("blocks sending a new message on a closed case but keeps history readable", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "Before closing" });

        await request(app).put(`/api/v1/cases/${caseId}`).set("Authorization", `Bearer ${adminToken}`).send({ status: "closed" });

        const blocked = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "After closing" });
        expect(blocked.status).toBe(400);

        const history = await request(app)
            .get(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(history.status).toBe(200);
        expect(history.body.data).toHaveLength(1);
    });

    it("marks the other party's messages as read when history is fetched", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { token: attorneyToken, user: attorneyUser } = await createUserAndToken({
            userType: "attorney",
            role: "user",
        });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken, attorneyUser._id.toString());

        const sent = await request(app)
            .post(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ content: "Please read this" });
        expect(sent.body.data.readAt).toBeFalsy();

        // The attorney (the other party) fetches history — that's what
        // should mark the client's message as read.
        await request(app).get(`/api/v1/messages?case=${caseId}`).set("Authorization", `Bearer ${attorneyToken}`);

        const reFetched = await request(app)
            .get(`/api/v1/messages?case=${caseId}`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(reFetched.body.data[0].readAt).toBeTruthy();
    });

    describe("GET /messages/client/:clientId (staff-facing, cross-case)", () => {
        it("returns every message across all of a client's cases", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { clientToken, client, caseId: firstCaseId } = await makeLinkedClientAndCase(adminToken);

            const secondCase = await request(app)
                .post("/api/v1/cases")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ title: "Second matter", type: "civil", status: "open", client: client._id.toString() });
            const secondCaseId = secondCase.body.data._id;

            await request(app)
                .post(`/api/v1/messages?case=${firstCaseId}`)
                .set("Authorization", `Bearer ${clientToken}`)
                .send({ content: "About case one" });
            await request(app)
                .post(`/api/v1/messages?case=${secondCaseId}`)
                .set("Authorization", `Bearer ${clientToken}`)
                .send({ content: "About case two" });

            const res = await request(app)
                .get(`/api/v1/messages/client/${client._id.toString()}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
        });

        it("does not mark messages as read", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { clientToken, client, caseId } = await makeLinkedClientAndCase(adminToken);

            await request(app)
                .post(`/api/v1/messages?case=${caseId}`)
                .set("Authorization", `Bearer ${clientToken}`)
                .send({ content: "Unread check" });

            await request(app)
                .get(`/api/v1/messages/client/${client._id.toString()}`)
                .set("Authorization", `Bearer ${adminToken}`);

            const stillUnread = await request(app)
                .get(`/api/v1/messages/client/${client._id.toString()}`)
                .set("Authorization", `Bearer ${adminToken}`);
            expect(stillUnread.body.data[0].readAt).toBeFalsy();
        });

        it("a client (non-staff) is rejected", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { clientToken, client } = await makeLinkedClientAndCase(adminToken);

            const res = await request(app)
                .get(`/api/v1/messages/client/${client._id.toString()}`)
                .set("Authorization", `Bearer ${clientToken}`);
            expect(res.status).toBe(403);
        });

        it("returns an empty list for a client with no cases", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { user: adminUser } = await createUserAndToken({ role: "admin" });
            const client = await ClientModel.create({
                firstName: "No",
                lastName: "Cases",
                email: `no-cases-${Date.now()}@lexcore.local`,
                phone: "1234567890",
                type: "individual",
                status: "active",
                createdBy: adminUser._id,
            });

            const res = await request(app)
                .get(`/api/v1/messages/client/${client._id.toString()}`)
                .set("Authorization", `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(0);
        });
    });
});
