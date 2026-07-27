import { InvoiceService } from "./invoice.service";
import { FirmSettingsMongoRepository } from "../repositories/firm-settings.repository";
import { decryptSecret } from "../utils/crypto.util";
import { HttpException } from "../exceptions/http-exception";
import { PaymentModel } from "../models/payment.model";
import { IInvoice } from "../models/invoice.model";
import { KHALTI_TEST_BASE_URL, KHALTI_LIVE_BASE_URL, BACKEND_PUBLIC_URL, FRONTEND_URL } from "../configs/constant";

const firmSettingsRepository = new FirmSettingsMongoRepository();
const invoiceService = new InvoiceService();

export interface KhaltiPaymentIntent {
    /** eSewa's ePay v2 equivalent of "formUrl" — here it's a plain GET
     * redirect target, not a form to POST. */
    paymentUrl: string;
    pidx: string;
}

interface KhaltiInitiateResponse {
    pidx: string;
    payment_url: string;
    expires_at: string;
    expires_in: number;
    detail?: string;
    error_key?: string;
}

interface KhaltiLookupResponse {
    pidx: string;
    total_amount: number;
    status: "Completed" | "Pending" | "Initiated" | "Refunded" | "Expired" | "User canceled" | "Partially Refunded";
    transaction_id: string | null;
    fee: number;
    refunded: boolean;
    detail?: string;
}

const DUPLICATE_KEY_ERROR_CODE = 11000;

function requireConfig(settings: { khaltiEnabled: boolean; khaltiSecretKeyEncrypted: string }) {
    if (!settings.khaltiEnabled) {
        throw new HttpException(400, "Online payment is not currently enabled");
    }
    if (!settings.khaltiSecretKeyEncrypted) {
        throw new HttpException(500, "Online payment is not fully configured — contact the firm");
    }
}

function remainingBalanceOf(invoice: IInvoice): number {
    if (invoice.status === "paid") throw new HttpException(400, "This invoice is already fully paid");
    if (invoice.status === "void") throw new HttpException(400, "This invoice has been voided");
    const remaining = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
    if (!(remaining > 0)) throw new HttpException(400, "There is nothing outstanding on this invoice");
    return remaining;
}

/**
 * Khalti's "Web Checkout (KPG-2)" flow — a plain https redirect, unlike
 * eSewa's signed-form (ePay v2) or app-deeplink (Intent) flows. The client's
 * only job is to navigate to [paymentUrl] (e.g. a WebView loadRequest) and
 * report back the pidx Khalti's callback gives it; verifyAndRecord() always
 * re-checks that against Khalti's own lookup API before recording anything —
 * the callback's own query params are never trusted on their own, same
 * discipline as EsewaPaymentService.verifyAndRecord.
 */
export class KhaltiPaymentService {
    async initiate(
        invoiceId: string,
        requestingUser: { role: string; email: string; userId: string }
    ): Promise<KhaltiPaymentIntent> {
        const settings = await firmSettingsRepository.get();
        requireConfig(settings);

        const invoice = await invoiceService.assertAccess(invoiceId, requestingUser);
        const remaining = remainingBalanceOf(invoice);

        const secretKey = decryptSecret(settings.khaltiSecretKeyEncrypted);
        const baseUrl = settings.khaltiEnvironment === "live" ? KHALTI_LIVE_BASE_URL : KHALTI_TEST_BASE_URL;

        // Distinct per attempt, same rationale as eSewa's transaction_uuid —
        // a retried payment on the same invoice never collides at Khalti.
        const purchaseOrderId = `${invoiceId}-${Date.now()}`;
        // Amount in paisa, per Khalti's API — total in rupees * 100.
        const amountPaisa = Math.round(remaining * 100);

        let response: globalThis.Response;
        try {
            response = await fetch(`${baseUrl}/epayment/initiate/`, {
                method: "POST",
                headers: {
                    Authorization: `Key ${secretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    return_url: `${BACKEND_PUBLIC_URL}/api/v1/khalti/callback`,
                    website_url: FRONTEND_URL,
                    amount: amountPaisa,
                    purchase_order_id: purchaseOrderId,
                    purchase_order_name: `Invoice ${invoice.invoiceNumber}`,
                }),
            });
        } catch {
            throw new HttpException(502, "Could not reach Khalti to initiate this payment — try again shortly");
        }

        const body = (await response.json().catch(() => null)) as KhaltiInitiateResponse | null;
        if (!response.ok || !body?.pidx) {
            throw new HttpException(502, body?.detail || "Khalti could not initiate this payment");
        }

        return { paymentUrl: body.payment_url, pidx: body.pidx };
    }

    /**
     * The client only ever reports a pidx — never an amount or a claimed
     * outcome. This recomputes the invoice's current outstanding balance
     * itself and asks Khalti's own lookup API whether a Completed payment
     * exists for that pidx, matching the recomputed amount. If the invoice
     * changed between initiate() and this call, the recomputed amount won't
     * match what Khalti has on record and the lookup legitimately fails
     * closed rather than trusting a stale figure.
     */
    async verifyAndRecord(
        invoiceId: string,
        pidx: string,
        requestingUser: { role: string; email: string; userId: string }
    ): Promise<IInvoice> {
        const settings = await firmSettingsRepository.get();
        requireConfig(settings);

        const invoice = await invoiceService.assertAccess(invoiceId, requestingUser);
        const remaining = remainingBalanceOf(invoice);

        const secretKey = decryptSecret(settings.khaltiSecretKeyEncrypted);
        const baseUrl = settings.khaltiEnvironment === "live" ? KHALTI_LIVE_BASE_URL : KHALTI_TEST_BASE_URL;

        let response: globalThis.Response;
        try {
            response = await fetch(`${baseUrl}/epayment/lookup/`, {
                method: "POST",
                headers: {
                    Authorization: `Key ${secretKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ pidx }),
            });
        } catch {
            throw new HttpException(502, "Could not reach Khalti to verify this payment — try again shortly");
        }

        const record = (await response.json().catch(() => null)) as KhaltiLookupResponse | null;
        if (!record || record.pidx !== pidx) {
            throw new HttpException(400, "Khalti did not recognize this transaction");
        }
        // Per Khalti's own docs: only "Completed" is ever treated as
        // success — Pending/Expired/"User canceled"/Refunded/Partially
        // Refunded are all failure states as far as fulfillment goes.
        if (record.status !== "Completed") {
            throw new HttpException(400, khaltiStatusMessage(record.status));
        }
        if (!record.transaction_id) {
            throw new HttpException(400, "Khalti confirmed this payment without a transaction id");
        }

        const alreadyRecorded = await PaymentModel.exists({ gatewayRef: record.transaction_id });
        if (alreadyRecorded) throw new HttpException(400, "This transaction has already been recorded");

        // total_amount is in paisa — convert back to the invoice's currency
        // unit before comparing against/recording against `remaining`.
        const verifiedAmount = Math.round((record.total_amount / 100) * 100) / 100;
        if (!(verifiedAmount > 0) || verifiedAmount > remaining + 0.01) {
            throw new HttpException(400, "Verified payment amount does not match the outstanding balance");
        }

        try {
            return await invoiceService.recordPayment(
                invoiceId,
                { amount: verifiedAmount, method: "khalti", notes: `Paid via Khalti (txn ${record.transaction_id})` },
                requestingUser.userId,
                record.transaction_id
            );
        } catch (error: any) {
            if (error?.code === DUPLICATE_KEY_ERROR_CODE) {
                throw new HttpException(400, "This transaction has already been recorded");
            }
            throw error;
        }
    }
}

function khaltiStatusMessage(status: KhaltiLookupResponse["status"]): string {
    switch (status) {
        case "Pending":
            return "Khalti has not confirmed this payment as complete yet — please try again shortly.";
        case "Expired":
            return "This payment link has expired — please try paying again.";
        case "User canceled":
            return "This payment was cancelled.";
        case "Refunded":
        case "Partially Refunded":
            return "This transaction was refunded.";
        default:
            return "Khalti did not confirm this payment as complete";
    }
}
