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

function mockFetchOnce(body: unknown, ok = true) {
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
            esewaClientId: "test-client-id",
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
        expect(res.body.data.esewaClientId).toBe("test-client-id");
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

    it("exposes only non-secret fields to any authenticated user, including clients", async () => {
        const { token: adminToken } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);

        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user" });
        const res = await request(app)
            .get("/api/v1/settings/payment/esewa-config")
            .set("Authorization", `Bearer ${clientToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({
            enabled: true,
            environment: "test",
            clientId: "test-client-id",
            secretId: "test-secret-key",
        });
    });
});

describe("eSewa payment verification", () => {
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
            .send({ refId: "REF-1" });

        expect(res.status).toBe(400);
    });

    it("verifies against eSewa's server, records the payment, and rejects replaying the same refId", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-ok-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockFetchOnce([
            { totalAmount: "100.0", transactionDetails: { status: "COMPLETE", referenceId: "REF-1" } },
        ]);

        const first = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ refId: "REF-1" });

        expect(first.status).toBe(201);
        expect(first.body.data.status).toBe("paid");
        expect(first.body.data.paidAmount).toBe(100);

        const payments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(payments.body.data[0].method).toBe("esewa");

        // Replaying the same refId (e.g. a retried request) must not double-record.
        mockFetchOnce([
            { totalAmount: "100.0", transactionDetails: { status: "COMPLETE", referenceId: "REF-1" } },
        ]);
        const replay = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ refId: "REF-1" });
        expect(replay.status).toBe(400);
    });

    it("does not trust a client-reported success — only eSewa's own verification response", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-fail-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockFetchOnce([
            { totalAmount: "100.0", transactionDetails: { status: "PENDING", referenceId: "REF-2" } },
        ]);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ refId: "REF-2" });

        expect(res.status).toBe(400);

        const payments = await request(app)
            .get(`/api/v1/invoices/${invoiceId}/payments`)
            .set("Authorization", `Bearer ${clientToken}`);
        expect(payments.body.data).toHaveLength(0);
    });

    it("rejects a verified amount that exceeds the invoice's remaining balance", async () => {
        const { token: adminToken, user: admin } = await createUserAndToken({ role: "admin" });
        await enableEsewa(adminToken);
        const clientEmail = `esewa-overpay-${Date.now()}@lexcore.local`;
        const { token: clientToken } = await createUserAndToken({ userType: "client", role: "user", email: clientEmail });
        const invoiceId = await setupInvoice(adminToken, admin._id.toString(), clientEmail, 100);

        mockFetchOnce([
            { totalAmount: "500.0", transactionDetails: { status: "COMPLETE", referenceId: "REF-3" } },
        ]);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${clientToken}`)
            .send({ refId: "REF-3" });

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

        mockFetchOnce([
            { totalAmount: "100.0", transactionDetails: { status: "COMPLETE", referenceId: "REF-4" } },
        ]);

        const res = await request(app)
            .post(`/api/v1/invoices/${invoiceId}/esewa/verify`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ refId: "REF-4" });

        expect(res.status).toBe(403);
    });
});
