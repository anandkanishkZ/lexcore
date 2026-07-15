import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";

async function makeClient(adminId: string, email = `invoice-client-${Date.now()}-${Math.random()}@lexcore.local`) {
    return ClientModel.create({
        firstName: "Invoice",
        lastName: "Client",
        email,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminId,
    });
}

describe("invoices", () => {
    it("computes item amounts, subtotal, tax, and total correctly on create", async () => {
        const { token, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({
                client: client._id.toString(),
                items: [
                    { description: "Consultation", quantity: 2, rate: 100 },
                    { description: "Filing fee", quantity: 1, rate: 50 },
                ],
                taxRate: 10,
                dueDate: "2026-12-31",
            });

        expect(res.status).toBe(201);
        expect(res.body.data.items[0].amount).toBe(200);
        expect(res.body.data.items[1].amount).toBe(50);
        expect(res.body.data.subtotal).toBe(250);
        expect(res.body.data.tax).toBe(25);
        expect(res.body.data.total).toBe(275);
        expect(res.body.data.status).toBe("draft");
        expect(res.body.data.paidAmount).toBe(0);
        expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    });

    it("rejects a request with no line items", async () => {
        const { token, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({ client: client._id.toString(), items: [], dueDate: "2026-12-31" });

        expect(res.status).toBe(400);
    });

    it("accumulates partial payments and only flips to paid once fully covered", async () => {
        const { token, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 300 }], dueDate: "2026-12-31" });
        const invoiceId = created.body.data._id;

        const first = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 100, method: "cash" });
        expect(first.status).toBe(201);
        expect(first.body.data.paidAmount).toBe(100);
        expect(first.body.data.status).toBe("draft");

        const second = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 200, method: "bank_transfer" });
        expect(second.status).toBe(201);
        expect(second.body.data.paidAmount).toBe(300);
        expect(second.body.data.status).toBe("paid");

        const payments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`);
        expect(payments.body.data).toHaveLength(2);
    });

    it("rejects recording a payment on an already-paid invoice", async () => {
        const { token, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 50 }], dueDate: "2026-12-31" });
        const invoiceId = created.body.data._id;

        await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 50, method: "cash" });

        const overpay = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 10, method: "cash" });

        expect(overpay.status).toBe(400);
    });

    it("blocks editing a paid invoice", async () => {
        const { token, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 20 }], dueDate: "2026-12-31" });
        const invoiceId = created.body.data._id;

        await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 20, method: "cash" });

        const edit = await request(app)
            .put(`/api/v1/invoices/${invoiceId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ notes: "trying to edit" });

        expect(edit.status).toBe(400);
    });

    it("a client only sees their own invoices via /mine and is denied on someone else's /:id", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const ownerEmail = "invoice-owner@lexcore.local";
        const otherEmail = "invoice-other@lexcore.local";
        const { token: ownerToken } = await createUserAndToken({ userType: "client", role: "user", email: ownerEmail });
        const { token: otherToken } = await createUserAndToken({ userType: "client", role: "user", email: otherEmail });

        const client = await makeClient(admin._id.toString(), ownerEmail);
        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 100 }], dueDate: "2026-12-31" });
        const invoiceId = created.body.data._id;

        const mine = await request(app).get("/api/v1/invoices/mine").set("Authorization", `Bearer ${ownerToken}`);
        expect(mine.body.data).toHaveLength(1);

        const ownerDirect = await request(app).get(`/api/v1/invoices/${invoiceId}`).set("Authorization", `Bearer ${ownerToken}`);
        expect(ownerDirect.status).toBe(200);

        const otherDirect = await request(app).get(`/api/v1/invoices/${invoiceId}`).set("Authorization", `Bearer ${otherToken}`);
        expect(otherDirect.status).toBe(403);

        const otherMine = await request(app).get("/api/v1/invoices/mine").set("Authorization", `Bearer ${otherToken}`);
        expect(otherMine.body.data).toHaveLength(0);
    });

    it("a client cannot read another client's payment history by invoice id", async () => {
        // Regression guard: GET /:id/payments used to skip the ownership
        // check that GET /:id already enforces, so a client could read
        // another client's payment amounts/methods/recorder just by
        // guessing/enumerating an invoice id.
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const ownerEmail = "invoice-pay-owner@lexcore.local";
        const otherEmail = "invoice-pay-other@lexcore.local";
        const { token: ownerToken } = await createUserAndToken({ userType: "client", role: "user", email: ownerEmail });
        const { token: otherToken } = await createUserAndToken({ userType: "client", role: "user", email: otherEmail });

        const client = await makeClient(admin._id.toString(), ownerEmail);
        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 100 }], dueDate: "2026-12-31" });
        const invoiceId = created.body.data._id;

        await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ amount: 25, method: "cash" });

        const ownerPayments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${ownerToken}`);
        expect(ownerPayments.status).toBe(200);
        expect(ownerPayments.body.data).toHaveLength(1);

        const otherPayments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(otherPayments.status).toBe(403);
    });

    it("rejects a payment that would exceed the invoice's remaining balance", async () => {
        const { token, user: admin } = await createUserAndToken({ role: "admin" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 100 }], dueDate: "2026-12-31" });
        const invoiceId = created.body.data._id;

        const overpay = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 150, method: "cash" });
        expect(overpay.status).toBe(400);

        const partial = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 60, method: "cash" });
        expect(partial.status).toBe(201);

        const remainderExceeded = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${token}`)
            .send({ amount: 50, method: "cash" });
        expect(remainderExceeded.status).toBe(400);
    });

    it("RBAC: non-admin staff can create/list but not delete; admin can delete", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const { token: staffToken } = await createUserAndToken({ userType: "paralegal", role: "user" });
        const client = await makeClient(admin._id.toString());

        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${staffToken}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate: 10 }], dueDate: "2026-12-31" });
        expect(created.status).toBe(201);
        const invoiceId = created.body.data._id;

        const listed = await request(app).get("/api/v1/invoices").set("Authorization", `Bearer ${staffToken}`);
        expect(listed.status).toBe(200);

        const staffDelete = await request(app).delete(`/api/v1/invoices/${invoiceId}`).set("Authorization", `Bearer ${staffToken}`);
        expect(staffDelete.status).toBe(403);

        const adminDelete = await request(app).delete(`/api/v1/invoices/${invoiceId}`).set("Authorization", `Bearer ${adminToken}`);
        expect(adminDelete.status).toBe(200);
    });

    it("rejects a client (non-staff) trying to create an invoice", async () => {
        const { token } = await createUserAndToken({ userType: "client", role: "user" });
        const res = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${token}`)
            .send({ client: "000000000000000000000000", items: [{ description: "Fee", quantity: 1, rate: 10 }], dueDate: "2026-12-31" });
        expect(res.status).toBe(403);
    });
});
