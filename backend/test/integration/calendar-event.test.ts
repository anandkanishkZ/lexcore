import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";
import { CalendarEventModel } from "../../src/models/calendar-event.model";
import { sendHearingReminders } from "../../src/utils/hearing-reminder.util";
import { NotificationModel } from "../../src/models/notification.model";

async function makeLinkedClientAndCase(adminToken: string, email?: string) {
    const { token: clientToken, user: clientUser } = await createUserAndToken({
        userType: "client",
        role: "user",
        email: email ?? `hearing-client-${Date.now()}-${Math.random()}@lexcore.local`,
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

describe("GET /calendar-events/mine (client-facing hearing list)", () => {
    it("a client sees hearings on their own case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Preliminary hearing", type: "hearing", date: "2026-08-01", time: "10:00", case: caseId });

        const res = await request(app).get("/api/v1/calendar-events/mine").set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Preliminary hearing");
    });

    it("does not show non-hearing event types on the client's own case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientToken, caseId } = await makeLinkedClientAndCase(adminToken);

        await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Internal strategy meeting", type: "meeting", date: "2026-08-01", case: caseId });

        const res = await request(app).get("/api/v1/calendar-events/mine").set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("does not show a hearing on another client's case", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { caseId: otherCaseId } = await makeLinkedClientAndCase(adminToken);
        const { clientToken } = await makeLinkedClientAndCase(adminToken);

        await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Someone else's hearing", type: "hearing", date: "2026-08-01", case: otherCaseId });

        const res = await request(app).get("/api/v1/calendar-events/mine").set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("a client with no cases gets an empty list, not an error", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });

        const res = await request(app).get("/api/v1/calendar-events/mine").set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("staff cannot browse the full calendar via a client attempting /", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });

        const res = await request(app).get("/api/v1/calendar-events").set("Authorization", `Bearer ${clientToken}`);
        expect(res.status).toBe(403);
    });
});

describe("hearing reminder sweep", () => {
    it("notifies the linked client for a hearing ~20h out and marks it reminded", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientUser, caseId } = await makeLinkedClientAndCase(adminToken);

        const in20Hours = new Date(Date.now() + 20 * 60 * 60 * 1000);
        const created = await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Soon hearing", type: "hearing", date: in20Hours.toISOString(), case: caseId });
        const hearingId = created.body.data._id;

        await sendHearingReminders();

        const notifications = await NotificationModel.find({ user: clientUser._id });
        expect(notifications).toHaveLength(1);
        expect(notifications[0]?.title).toBe("Upcoming hearing");

        const reloaded = await CalendarEventModel.findById(hearingId);
        expect(reloaded!.reminderSent).toBe(true);
    });

    it("does not notify for a hearing 48h out", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientUser, caseId } = await makeLinkedClientAndCase(adminToken);

        const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Far hearing", type: "hearing", date: in48Hours.toISOString(), case: caseId });

        await sendHearingReminders();

        const notifications = await NotificationModel.find({ user: clientUser._id });
        expect(notifications).toHaveLength(0);
    });

    it("does not send a second reminder for a hearing already marked reminderSent", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { clientUser, caseId } = await makeLinkedClientAndCase(adminToken);

        const in10Hours = new Date(Date.now() + 10 * 60 * 60 * 1000);
        const created = await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Twice-swept hearing", type: "hearing", date: in10Hours.toISOString(), case: caseId });

        await sendHearingReminders();
        await sendHearingReminders();

        const notifications = await NotificationModel.find({ user: clientUser._id, title: "Upcoming hearing" });
        expect(notifications).toHaveLength(1);
        void created;
    });

    it("marks a hearing reminded even when the case has no linked client login", async () => {
        const { token: adminToken, user: adminUser } = await createUserAndToken({ role: "admin" });
        const client = await ClientModel.create({
            firstName: "No",
            lastName: "Login",
            email: `no-login-${Date.now()}@lexcore.local`,
            phone: "1234567890",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
        });
        const created = await request(app)
            .post("/api/v1/cases")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "No portal client case", type: "civil", status: "open", client: client._id.toString() });
        const caseId = created.body.data._id;

        const in5Hours = new Date(Date.now() + 5 * 60 * 60 * 1000);
        const hearing = await request(app)
            .post("/api/v1/calendar-events")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Unreachable hearing", type: "hearing", date: in5Hours.toISOString(), case: caseId });

        await expect(sendHearingReminders()).resolves.not.toThrow();

        const reloaded = await CalendarEventModel.findById(hearing.body.data._id);
        expect(reloaded!.reminderSent).toBe(true);
    });
});
