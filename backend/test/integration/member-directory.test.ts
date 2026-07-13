import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

/**
 * Regression coverage for the /members "leaky abstraction" bug: `source`
 * reflects which collection a row came from (User login vs Client CRM
 * contact), not whether the person is staff — a client's own login row is
 * `source: "account"` too. `isStaff` is the one field every "assign to
 * staff" dropdown must trust instead. Also covers the identity-merge fix:
 * a Client linked to a User via `linkedUserId` must appear as exactly one
 * row, not two unrelated rows for the same person.
 */
describe("GET /members — account/contact source vs isStaff", () => {
    it("an unlinked client's own login row is source: account but isStaff: false", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { user: clientUser } = await createUserAndToken({
            userType: "client",
            role: "user",
            firstName: "Regression",
            lastName: "Client",
        });

        const res = await request(app)
            .get("/api/v1/members?page=1&size=100")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        const row = res.body.data.find((m: any) => m._id === clientUser._id.toString());
        expect(row).toBeDefined();
        expect(row.source).toBe("account");
        expect(row.isStaff).toBe(false);
        expect(row.hasPortalAccess).toBe(true);
        expect(row.subtype).toBe("client");
    });

    it("a Client-collection-only contact is source: contact, isStaff: false, hasPortalAccess: false", async () => {
        const { token: adminToken, user: adminUser } = await createUserAndToken({ role: "admin" });
        const contact = await ClientModel.create({
            firstName: "Contact",
            lastName: "Only",
            email: `contact-only-${Date.now()}@lexcore.local`,
            phone: "1234567890",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
        });

        const res = await request(app)
            .get("/api/v1/members?page=1&size=100")
            .set("Authorization", `Bearer ${adminToken}`);

        const row = res.body.data.find((m: any) => m._id === contact._id.toString());
        expect(row).toBeDefined();
        expect(row.source).toBe("contact");
        expect(row.isStaff).toBe(false);
        expect(row.hasPortalAccess).toBe(false);
    });

    it("a Client linked to a User appears as exactly ONE row, not two", async () => {
        const { token: adminToken, user: adminUser } = await createUserAndToken({ role: "admin" });
        const { user: clientUser } = await createUserAndToken({
            userType: "client",
            role: "user",
            firstName: "Linked",
            lastName: "Person",
        });
        const contact = await ClientModel.create({
            firstName: "Linked",
            lastName: "Person",
            email: `linked-${Date.now()}@lexcore.local`,
            phone: "1234567890",
            type: "individual",
            status: "active",
            createdBy: adminUser._id,
            linkedUserId: clientUser._id,
        });

        const res = await request(app)
            .get("/api/v1/members?page=1&size=100")
            .set("Authorization", `Bearer ${adminToken}`);

        const matchingRows = res.body.data.filter(
            (m: any) => m._id === contact._id.toString() || m._id === clientUser._id.toString()
        );
        expect(matchingRows).toHaveLength(1);
        expect(matchingRows[0]._id).toBe(contact._id.toString());
        expect(matchingRows[0].source).toBe("contact");
        expect(matchingRows[0].isStaff).toBe(false);
        expect(matchingRows[0].hasPortalAccess).toBe(true);
    });

    it("a genuine staff member (non-admin userType) is source: account and isStaff: true", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const { user: paralegalUser } = await createUserAndToken({ userType: "paralegal", role: "user" });

        const res = await request(app)
            .get("/api/v1/members?page=1&size=100")
            .set("Authorization", `Bearer ${adminToken}`);

        const row = res.body.data.find((m: any) => m._id === paralegalUser._id.toString());
        expect(row).toBeDefined();
        expect(row.source).toBe("account");
        expect(row.isStaff).toBe(true);
        expect(row.hasPortalAccess).toBe(true);
        expect(row.subtype).toBe("paralegal");
    });

    it("an admin is isStaff: true regardless of userType", async () => {
        const { token: adminToken, user: adminUser } = await createUserAndToken({ userType: "attorney", role: "admin" });

        const res = await request(app)
            .get("/api/v1/members?page=1&size=100")
            .set("Authorization", `Bearer ${adminToken}`);

        const row = res.body.data.find((m: any) => m._id === adminUser._id.toString());
        expect(row).toBeDefined();
        expect(row.isStaff).toBe(true);
        expect(row.subtype).toBe("admin");
    });
});
