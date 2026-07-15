import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";

describe("client management", () => {
    describe("DELETE /clients/:id", () => {
        it("rejects a non-admin staff member", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { token: staffToken } = await createUserAndToken({ userType: "paralegal" });

            const created = await request(app)
                .post("/api/v1/clients")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    firstName: "Delete",
                    lastName: "Guard",
                    email: `delete-guard-${Date.now()}@lexcore.local`,
                    phone: "1234567890",
                    type: "individual",
                });

            const res = await request(app)
                .delete(`/api/v1/clients/${created.body.data._id}`)
                .set("Authorization", `Bearer ${staffToken}`);
            expect(res.status).toBe(403);
        });

        it("blocks deleting a client with an open case linked to them", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });

            const client = await request(app)
                .post("/api/v1/clients")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    firstName: "Has",
                    lastName: "OpenCase",
                    email: `has-case-${Date.now()}@lexcore.local`,
                    phone: "1234567890",
                    type: "individual",
                });
            const clientId = client.body.data._id;

            await request(app)
                .post("/api/v1/cases")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ title: "Linked case", type: "civil", status: "open", client: clientId });

            const res = await request(app)
                .delete(`/api/v1/clients/${clientId}`)
                .set("Authorization", `Bearer ${adminToken}`);
            expect(res.status).toBe(400);
        });

        it("allows an admin to delete a client with no linked cases or invoices", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });

            const client = await request(app)
                .post("/api/v1/clients")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    firstName: "No",
                    lastName: "Links",
                    email: `no-links-${Date.now()}@lexcore.local`,
                    phone: "1234567890",
                    type: "individual",
                });

            const res = await request(app)
                .delete(`/api/v1/clients/${client.body.data._id}`)
                .set("Authorization", `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });

    describe("POST /clients (auto-link to an existing User)", () => {
        it("links a new Client record to an existing User account with the same email", async () => {
            const { token: adminToken } = await createUserAndToken({ role: "admin" });
            const { user: existingUser } = await createUserAndToken({ userType: "client" });

            const res = await request(app)
                .post("/api/v1/clients")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    firstName: existingUser.firstName,
                    lastName: existingUser.lastName,
                    email: existingUser.email,
                    phone: "1234567890",
                    type: "individual",
                });

            expect(res.status).toBe(201);
            expect(res.body.data.linkedUserId).toBe(existingUser._id.toString());
        });
    });
});
