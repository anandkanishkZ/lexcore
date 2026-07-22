import crypto from "crypto";
import { InvoiceService } from "./invoice.service";
import { HttpException } from "../exceptions/http-exception";
import { PaymentModel } from "../models/payment.model";
import { EsewaIntentBookingModel, IEsewaIntentBooking } from "../models/esewa-intent-booking.model";
import { IInvoice } from "../models/invoice.model";
import {
    ESEWA_INTENT_PRODUCT_CODE,
    ESEWA_INTENT_ACCESS_KEY,
    ESEWA_INTENT_BASE_URL,
    BACKEND_PUBLIC_URL,
} from "../configs/constant";
import { EsewaIntentCallbackDTO } from "../dtos/invoice.dto";

const invoiceService = new InvoiceService();

export interface EsewaIntentPaymentIntent {
    bookingId: string;
    deeplink: string;
    correlationId: string;
    transactionUuid: string;
}

interface EsewaIntentBookResponse {
    code: string;
    data?: { booking_id: string; deeplink: string; correlation_id: string };
    message?: string;
    error_message?: string;
}

interface EsewaIntentStatusResponse {
    code: string;
    data?: {
        booking_id: string;
        product_code: string;
        status: "BOOKED" | "SUCCESS" | "PENDING" | "FAILED" | "CANCELED" | "REVERTED";
        correlation_id: string;
        transaction_id: string;
        reference_code: string;
        updated_at: string;
    };
    error_message?: string;
}

const DUPLICATE_KEY_ERROR_CODE = 11000;

function requireConfig(): string {
    if (!ESEWA_INTENT_ACCESS_KEY) {
        throw new HttpException(
            503,
            "eSewa Intent payment is not configured on the server — ESEWA_INTENT_ACCESS_KEY is unset."
        );
    }
    return ESEWA_INTENT_ACCESS_KEY;
}

function sign(fields: Record<string, string | number>, signedFieldNames: string, accessKey: string): string {
    const message = signedFieldNames
        .split(",")
        .map((field) => `${field}=${fields[field]}`)
        .join(",");
    return crypto.createHmac("sha256", accessKey).update(message).digest("base64");
}

function remainingBalanceOf(invoice: IInvoice): number {
    if (invoice.status === "paid") throw new HttpException(400, "This invoice is already fully paid");
    if (invoice.status === "void") throw new HttpException(400, "This invoice has been voided");
    const remaining = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
    if (!(remaining > 0)) throw new HttpException(400, "There is nothing outstanding on this invoice");
    return remaining;
}

/**
 * eSewa's "Intent Payment" flow — a separate integration from ePay v2
 * (see EsewaPaymentService). Instead of the client POSTing to an eSewa-hosted
 * web form and logging in there, the backend books a transaction with eSewa
 * and hands the client a deeplink into the real eSewa app, where the user
 * authenticates with their own MPIN. eSewa then reports the outcome to our
 * callback_url server-to-server (see handleCallback) — the client polling
 * getStatus() is only a fallback for when that callback is delayed or lost.
 */
export class EsewaIntentPaymentService {
    async initiate(
        invoiceId: string,
        requestingUser: { role: string; email: string; userId: string },
        redirectUrl?: string
    ): Promise<EsewaIntentPaymentIntent> {
        const accessKey = requireConfig();
        const invoice = await invoiceService.assertAccess(invoiceId, requestingUser);
        const remaining = remainingBalanceOf(invoice);

        const transactionUuid = `${invoiceId}-${Date.now()}`;
        const amount = remaining;

        const fields: Record<string, string | number> = {
            product_code: ESEWA_INTENT_PRODUCT_CODE,
            amount,
            transaction_uuid: transactionUuid,
        };
        const signedFieldNames = "product_code,amount,transaction_uuid";
        const signature = sign(fields, signedFieldNames, accessKey);

        const payload = {
            product_code: ESEWA_INTENT_PRODUCT_CODE,
            amount,
            transaction_uuid: transactionUuid,
            signed_field_names: signedFieldNames,
            signature,
            callback_url: `${BACKEND_PUBLIC_URL}/api/v1/esewa/intent/callback`,
            redirect_url: redirectUrl || `${BACKEND_PUBLIC_URL}/api/v1/esewa/callback/success`,
            properties: {
                invoice_id: invoiceId,
            },
        };

        let response: globalThis.Response;
        try {
            response = await fetch(`${ESEWA_INTENT_BASE_URL}/api/client/intent/payment/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } catch {
            throw new HttpException(502, "Could not reach eSewa to book this payment — try again shortly");
        }

        const body = (await response.json().catch(() => null)) as EsewaIntentBookResponse | null;
        if (!response.ok || !body?.data) {
            throw new HttpException(502, body?.error_message || "eSewa could not book this payment");
        }

        await EsewaIntentBookingModel.create({
            invoice: invoiceId,
            transactionUuid,
            bookingId: body.data.booking_id,
            correlationId: body.data.correlation_id,
            amount,
            status: "booked",
        });

        return {
            bookingId: body.data.booking_id,
            deeplink: body.data.deeplink,
            correlationId: body.data.correlation_id,
            transactionUuid,
        };
    }

    /** eSewa's server-to-server notification after a booking resolves.
     * Verifies the signature ourselves before trusting anything in the
     * payload — the same "never trust a client-reported outcome" discipline
     * ePay v2's verifyAndRecord uses, just applied to eSewa's own server
     * instead of our client's. */
    async handleCallback(payload: EsewaIntentCallbackDTO): Promise<void> {
        const accessKey = requireConfig();

        const fields: Record<string, string | number> = {
            product_code: payload.product_code,
            amount: payload.amount,
            reference_code: payload.reference_code,
            correlation_id: payload.correlation_id,
            status: payload.status,
        };
        const expectedSignature = sign(fields, payload.signed_field_names, accessKey);
        if (expectedSignature !== payload.signature) {
            throw new HttpException(400, "Invalid callback signature");
        }

        const booking = await EsewaIntentBookingModel.findOne({ correlationId: payload.correlation_id });
        if (!booking) {
            throw new HttpException(404, "Unknown booking for this callback");
        }

        await this.applyStatus(booking, payload.status, payload.reference_code);
    }

    /** Fallback for the client to poll when no callback has landed yet
     * (eSewa's own guidance: check after 5 minutes with no response). */
    async getStatus(
        invoiceId: string,
        transactionUuid: string,
        requestingUser: { role: string; email: string }
    ): Promise<{ status: IEsewaIntentBooking["status"] }> {
        await invoiceService.assertAccess(invoiceId, requestingUser);

        const booking = await EsewaIntentBookingModel.findOne({ invoice: invoiceId, transactionUuid });
        if (!booking) throw new HttpException(404, "No such payment booking");

        if (booking.status !== "booked") {
            return { status: booking.status };
        }

        const accessKey = requireConfig();
        const fields: Record<string, string | number> = {
            booking_id: booking.bookingId,
            product_code: ESEWA_INTENT_PRODUCT_CODE,
            correlation_id: booking.correlationId,
        };
        const signedFieldNames = "booking_id,product_code,correlation_id";
        const signature = sign(fields, signedFieldNames, accessKey);

        let response: globalThis.Response;
        try {
            response = await fetch(`${ESEWA_INTENT_BASE_URL}/api/client/intent/payment/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, signed_field_names: signedFieldNames, signature }),
            });
        } catch {
            throw new HttpException(502, "Could not reach eSewa to check this payment's status");
        }

        const body = (await response.json().catch(() => null)) as EsewaIntentStatusResponse | null;
        if (!response.ok || !body?.data) {
            return { status: booking.status };
        }

        await this.applyStatus(booking, body.data.status, body.data.reference_code);
        const refreshed = await EsewaIntentBookingModel.findById(booking._id);
        return { status: refreshed!.status };
    }

    private async applyStatus(
        booking: IEsewaIntentBooking,
        rawStatus: string,
        referenceCode: string
    ): Promise<void> {
        const status = rawStatus.toLowerCase() as IEsewaIntentBooking["status"];
        if (!["booked", "success", "failed", "canceled", "reverted"].includes(status)) return;
        if (booking.status === status) return;

        booking.status = status;
        booking.referenceCode = referenceCode;
        await booking.save();

        if (status !== "success") return;

        const alreadyRecorded = await PaymentModel.exists({ gatewayRef: referenceCode });
        if (alreadyRecorded) return;

        const invoice = await invoiceService.assertAccess(booking.invoice.toString(), { role: "admin", email: "" });
        const remaining = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
        const amount = Math.min(booking.amount, remaining);
        if (!(amount > 0)) return;

        try {
            await invoiceService.recordPayment(
                booking.invoice.toString(),
                { amount, method: "esewa", notes: `Paid via eSewa Intent (ref ${referenceCode})` },
                // System-recorded: this fires from an unauthenticated eSewa
                // callback, not a logged-in staff action, so there is no
                // requesting user to attribute it to — attributed to whoever
                // created the invoice instead, a real, always-present User id.
                invoice.createdBy.toString(),
                referenceCode
            );
        } catch (error: any) {
            if (error?.code === DUPLICATE_KEY_ERROR_CODE) return;
            throw error;
        }
    }
}
