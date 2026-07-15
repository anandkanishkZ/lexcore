import request from "supertest";
import app from "../../src/app";
import { createUserAndToken } from "../helpers";
import { ClientModel } from "../../src/models/client.model";
import { CaseModel } from "../../src/models/case.model";
import { InvoiceModel } from "../../src/models/invoice.model";
import { PaymentModel } from "../../src/models/payment.model";
import { TaskModel } from "../../src/models/task.model";

async function makeClient(adminId: string) {
    return ClientModel.create({
        firstName: "Report",
        lastName: "Client",
        email: `report-client-${Date.now()}-${Math.random()}@lexcore.local`,
        phone: "1234567890",
        type: "individual",
        status: "active",
        createdBy: adminId,
    });
}

async function makeCase(clientId: string, adminId: string, status: string) {
    return CaseModel.create({
        title: "Report test case",
        caseNumber: `CASE-RPT-${Date.now()}-${Math.random()}`,
        type: "civil",
        status,
        client: clientId,
        createdBy: adminId,
    });
}

async function makeInvoice(clientId: string, adminId: string) {
    return InvoiceModel.create({
        invoiceNumber: `INV-RPT-${Date.now()}-${Math.random()}`,
        client: clientId,
        items: [{ description: "Fee", quantity: 1, rate: 100, amount: 100 }],
        subtotal: 100,
        tax: 0,
        total: 100,
        dueDate: new Date(),
        createdBy: adminId,
    });
}

async function makePayment(invoiceId: string, adminId: string, amount: number, date: Date) {
    return PaymentModel.create({
        invoice: invoiceId,
        amount,
        date,
        receiptNumber: `RCPT-RPT-${Date.now()}-${Math.random()}`,
        recordedBy: adminId,
    });
}

describe("reports (staff-only canned aggregates)", () => {
    it("rejects a client on all three routes", async () => {
        const { token: clientToken } = await createUserAndToken({ userType: "client" });

        const a = await request(app).get("/api/v1/reports/cases-by-status").set("Authorization", `Bearer ${clientToken}`);
        expect(a.status).toBe(403);
        const b = await request(app).get("/api/v1/reports/revenue-by-month").set("Authorization", `Bearer ${clientToken}`);
        expect(b.status).toBe(403);
        const c = await request(app).get("/api/v1/reports/task-completion").set("Authorization", `Bearer ${clientToken}`);
        expect(c.status).toBe(403);
    });

    describe("cases-by-status", () => {
        it("counts cases per status and zero-fills statuses with no cases", async () => {
            const { token, user: admin } = await createUserAndToken({ role: "admin" });
            const client = await makeClient(admin._id.toString());
            await makeCase(client._id.toString(), admin._id.toString(), "open");
            await makeCase(client._id.toString(), admin._id.toString(), "open");
            await makeCase(client._id.toString(), admin._id.toString(), "closed");
            // "pending" and "on hold" get no cases — must still appear as 0.

            const res = await request(app).get("/api/v1/reports/cases-by-status").set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(200);
            const byStatus = Object.fromEntries(res.body.data.map((r: any) => [r.status, r.count]));
            expect(byStatus).toEqual({ open: 2, pending: 0, closed: 1, "on hold": 0 });
        });
    });

    describe("revenue-by-month", () => {
        it("sums payments per month and zero-fills a gap month", async () => {
            const { token, user: admin } = await createUserAndToken({ role: "admin" });
            const client = await makeClient(admin._id.toString());
            const invoice = await makeInvoice(client._id.toString(), admin._id.toString());

            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
            const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 15);

            await makePayment(invoice._id.toString(), admin._id.toString(), 100, thisMonth);
            await makePayment(invoice._id.toString(), admin._id.toString(), 50, thisMonth);
            await makePayment(invoice._id.toString(), admin._id.toString(), 200, twoMonthsAgo);

            const res = await request(app)
                .get("/api/v1/reports/revenue-by-month?months=3")
                .set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(3);

            const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const byMonth = Object.fromEntries(res.body.data.map((r: any) => [r.month, r.total]));
            expect(byMonth[key(twoMonthsAgo)]).toBe(200);
            expect(byMonth[key(thisMonth)]).toBe(150);
            // The middle month (one month ago) had no payments — zero-filled, not missing.
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            expect(byMonth[key(oneMonthAgo)]).toBe(0);
        });

        it("attributes a payment at the exact UTC month boundary to the correct month", async () => {
            // Regression guard: revenueByMonth's $match/zero-fill range used to
            // be computed with local-time Date methods while $dateToString
            // buckets in UTC — on any server whose local timezone isn't UTC, a
            // payment dated right at a local month boundary was silently
            // dropped from its bucket or mislabeled into the adjacent one. A
            // payment at the exact first instant of the current UTC month
            // must land in that month regardless of what local timezone the
            // test machine happens to run in.
            const { token, user: admin } = await createUserAndToken({ role: "admin" });
            const client = await makeClient(admin._id.toString());
            const invoice = await makeInvoice(client._id.toString(), admin._id.toString());

            const now = new Date();
            const boundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
            await makePayment(invoice._id.toString(), admin._id.toString(), 75, boundary);

            const res = await request(app)
                .get("/api/v1/reports/revenue-by-month?months=1")
                .set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(200);

            const key = `${boundary.getUTCFullYear()}-${String(boundary.getUTCMonth() + 1).padStart(2, "0")}`;
            expect(res.body.data).toEqual([{ month: key, total: 75 }]);
        });

        it("rejects an out-of-range months value", async () => {
            const { token } = await createUserAndToken({ role: "admin" });
            const res = await request(app)
                .get("/api/v1/reports/revenue-by-month?months=99")
                .set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(400);
        });
    });

    describe("task-completion", () => {
        it("returns all zeros and a 0 completion rate when there are no tasks", async () => {
            const { token } = await createUserAndToken({ role: "admin" });
            const res = await request(app).get("/api/v1/reports/task-completion").set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ todo: 0, inProgress: 0, done: 0, completionRate: 0 });
        });

        it("counts tasks per status and computes the completion rate", async () => {
            const { token, user: admin } = await createUserAndToken({ role: "admin" });
            const common = { description: "", createdBy: admin._id };
            await TaskModel.create({ ...common, title: "t1", status: "todo" });
            await TaskModel.create({ ...common, title: "t2", status: "in_progress" });
            await TaskModel.create({ ...common, title: "t3", status: "done" });
            await TaskModel.create({ ...common, title: "t4", status: "done" });

            const res = await request(app).get("/api/v1/reports/task-completion").set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({ todo: 1, inProgress: 1, done: 2, completionRate: 0.5 });
        });
    });
});
