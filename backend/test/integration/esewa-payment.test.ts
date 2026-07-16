import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";
import { FirmSettingsModel } from "../../src/models/firm-settings.model";

async function makeClient(adminId: string, email: string) {
    return ClientModel.create({
        firstName: "Esewa",
        lastName: "Client",
        email,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminId,
    });
}

/** Mocks the eSewa transaction-status endpoint (GET, single JSON object) —
 * the only outbound call EsewaPaymentService makes now that initiate()
 * never leaves the server. */
function mockStatus(body: unknown, ok = true) {
    (global as any).fetch = jest.fn().mockResolvedValue({
        ok,
        json: async () => body,
    });
}

async function enableEsewa(adminToken: string) {
    const res = await request(app)
        .put("/api/v1/settings/firm")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
            name: "Lexcore",
            esewaEnabled: true,
            esewaEnvironment: "test",
            esewaClientId: "EPAYTEST",
            esewaSecret: "test-secret-key",
        });
    expect(res.status).toBe(200);
    return res;
}

describe("eSewa payment gateway settings", () => {
    afterEach(() => {
        delete (global as any).fetch;
        jest.restoreAllMocks();
    });

    it("lets an admin configure eSewa and never echoes the secret back", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        const res = await enableEsewa(adminToken);

        expect(res.body.data.esewaEnabled).toBe(true);
        expect(res.body.data.esewaClientId).toBe("EPAYTEST");
        expect(res.body.data.esewaSecretConfigured).toBe(true);
        expect(res.body.data.esewaSecretEncrypted).toBeUndefined();
        expect(res.body.data.esewaSecret).toBeUndefined();

        const stored = await FirmSettingsModel.findOne();
        expect(stored?.esewaSecretEncrypted).not.toBe("test-secret-key");
        expect(stored?.esewaSecretEncrypted).toContain(":");
    });

    it("keeps the previously saved secret when a settings update omits it", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const before = await FirmSettingsModel.findOne();

        await request(app)
            .put("/api/v1/settings/firm")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "Lexcore Renamed", esewaEnabled: true });

        const after = await FirmSettingsModel.findOne();
        expect(after?.esewaSecretEncrypted).toBe(before?.esewaSecretEncrypted);
        expect(after?.name).toBe("Lexcore Renamed");
    });

    it("exposes only enabled/environment to any authenticated user — never the merchant code or secret", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);

        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const res = await request(app)
            .get("/api/v1/settings/payment/esewa-config")
            .set("Authorization", `Bearer ${clientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ enabled: true, environment: "test" });
    });

    it("exposes name/currency to any authenticated user, including clients", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        await request(app)
            .put("/api/v1/settings/firm")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "Lexcore", currency: "NPR" });

        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const res = await request(app)
            .get("/api/v1/settings/public")
            .set("Authorization", `Bearer ${clientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ name: "Lexcore", currency: "NPR" });
    });
});

describe("eSewa payment: initiate", () => {
    async function setupInvoice(adminToken: string, adminId: string, clientEmail: string, rate = 100) {
        const client = await makeClient(adminId, clientEmail);
        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate }], dueDate: "2026-12-31" });
        return created.body.data._id as string;
    }

    it("rejects initiate when eSewa is not enabled", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const clientEmail = `esewa-init-off-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/initiate`)
            .set("Authorization", `Bearer ${clientToken}`);

        expect(res.status).toBe(400);
    });

    it("returns a signed form the client never had to build itself", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-init-ok-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 150);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/initiate`)
            .set("Authorization", `Bearer ${clientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.formUrl).toBe("https://rc-epay.esewa.com.np/api/epay/main/v2/form");
        const fields = res.body.data.fields;
        expect(fields.amount).toBe("150.00");
        expect(fields.total_amount).toBe("150.00");
        expect(fields.product_code).toBe("EPAYTEST");
        expect(fields.transaction_uuid).toContain(invoiceId);
        expect(fields.signed_field_names).toBe("total_amount,transaction_uuid,product_code");
        expect(typeof fields.signature).toBe("string");
        expect(fields.signature.length).toBeGreaterThan(0);
        // The secret itself never appears anywhere in the response.
        expect(JSON.stringify(res.body.data)).not.toContain("test-secret-key");
        expect(fields.success_url).toContain("lexcore://esewa-callback");
        expect(fields.success_url).toContain(encodeURIComponent(fields.transaction_uuid));
    });

    it("denies initiating a payment against someone else's invoice", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const ownerEmail = `esewa-init-owner-${Date.now()}@lexcore.local`;
        const otherEmail = `esewa-init-other-${Date.now()}@lexcore.local`;
        await createUserAndToken({ userType: "client", role: "user", email: ownerEmail });
        const { token: otherToken } = await createUserAndToken({ userType: "client", role: "user", email: otherEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), ownerEmail, 100);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/initiate`)
            .set("Authorization", `Bearer ${otherToken}`);

        expect(res.status).toBe(403);
    });
});

describe("eSewa payment: verify", () => {
    afterEach(() => {
        delete (global as any).fetch;
        jest.restoreAllMocks();
    });

    async function setupInvoice(adminToken: string, adminId: string, clientEmail: string, rate = 100) {
        const client = await makeClient(adminId, clientEmail);
        const created = await request(app)
            .post("/api/v1/invoices")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ client: client._id.toString(), items: [{ description: "Fee", quantity: 1, rate }], dueDate: "2026-12-31" });
        return created.body.data._id as string;
    }

    it("rejects verification when eSewa is not enabled", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        const clientEmail = `esewa-off-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ transactionUuid: "TXN-1" });

        expect(res.status).toBe(400);
    });

    it("verifies against eSewa's status endpoint, records the payment, and rejects replaying the same ref_id", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-ok-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockStatus({ product_code: "EPAYTEST", transaction_uuid: "TXN-1", total_amount: 100.0, status: "COMPLETE", ref_id: "REF-1" });

        const first = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ transactionUuid: "TXN-1" });

        expect(first.status).toBe(201);
        expect(first.body.data.status).toBe("paid");
        expect(first.body.data.paidAmount).toBe(100);

        const payments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(payments.body.data[0].method).toBe("esewa");

        // Replaying the same ref_id (e.g. a retried verify call) must not double-record.
        mockStatus({ product_code: "EPAYTEST", transaction_uuid: "TXN-1", total_amount: 100.0, status: "COMPLETE", ref_id: "REF-1" });
        const replay = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ transactionUuid: "TXN-1" });
        expect(replay.status).toBe(400);
    });

    it("does not trust a client-reported success — only eSewa's own status response", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-fail-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockStatus({ product_code: "EPAYTEST", transaction_uuid: "TXN-2", total_amount: 100.0, status: "PENDING", ref_id: null });

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ transactionUuid: "TXN-2" });

        expect(res.status).toBe(400);

        const payments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(payments.body.data).toHaveLength(0);
    });

    it("rejects a status response for the wrong product_code or transaction_uuid", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-mismatch-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockStatus({ product_code: "SOMEONE-ELSE", transaction_uuid: "TXN-3", total_amount: 100.0, status: "COMPLETE", ref_id: "REF-3" });

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ transactionUuid: "TXN-3" });

        expect(res.status).toBe(400);
    });

    it("rejects a verified amount that exceeds the invoice's remaining balance", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-overpay-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockStatus({ product_code: "EPAYTEST", transaction_uuid: "TXN-4", total_amount: 500.0, status: "COMPLETE", ref_id: "REF-4" });

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ transactionUuid: "TXN-4" });

        expect(res.status).toBe(400);
    });

    it("denies verifying a payment against someone else's invoice", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const ownerEmail = `esewa-owner-${Date.now()}@lexcore.local`;
        const otherEmail = `esewa-other-${Date.now()}@lexcore.local`;
        await createUserAndToken({ userType: "client", role: "user", email: ownerEmail });
        const { token: otherToken } = await createUserAndToken({ userType: "client", role: "user", email: otherEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), ownerEmail, 100);

        mockStatus({ product_code: "EPAYTEST", transaction_uuid: "TXN-5", total_amount: 100.0, status: "COMPLETE", ref_id: "REF-5" });

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ transactionUuid: "TXN-5" });

        expect(res.status).toBe(403);
    });
});
