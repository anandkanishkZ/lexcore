import crypto from "crypto";
import { InvoiceService } from "./invoice.service";
import { FirmSettingsMongoRepository } from "../repositories/firm-settings.repository";
import { decryptSecret } from "../utils/crypto.util";
import { HttpException } from "../exceptions/http-exception";
import { PaymentModel } from "../models/payment.model";
import { IInvoice } from "../models/invoice.model";

const firmSettingsRepository = new FirmSettingsMongoRepository();
const invoiceService = new InvoiceService();

const SIGNED_FIELD_NAMES = "total_amount,transaction_uuid,product_code";

export interface EsewaPaymentIntent {
    /** The eSewa-hosted form endpoint the client POSTs [fields] to (a real
     * page navigation — e.g. a WebView loadRequest — not a fetch/XHR). */
    formUrl: string;
    fields: {
        amount: string;
        tax_amount: string;
        total_amount: string;
        transaction_uuid: string;
        product_code: string;
        product_service_charge: string;
        product_delivery_charge: string;
        success_url: string;
        failure_url: string;
        signed_field_names: string;
        signature: string;
    };
}

/** eSewa's transaction-status response — see developer.esewa.com.np's ePay
 * v2 "Status Check" section. `total_amount` comes back as a number even
 * though it was submitted as a string. */
interface EsewaStatusResponse {
    product_code: string;
    transaction_uuid: string;
    total_amount: number;
    status: "PENDING" | "COMPLETE" | "FULL_REFUND" | "PARTIAL_REFUND" | "AMBIGUOUS" | "NOT_FOUND" | "CANCELED";
    ref_id: string | null;
}

const STATUS_MESSAGES: Partial<Record<EsewaStatusResponse["status"], string>> = {
    PENDING: "eSewa has not confirmed this payment as complete yet — please try again shortly.",
    CANCELED: "This payment was cancelled.",
    NOT_FOUND: "eSewa could not find this transaction — it may have expired. Please try paying again.",
    AMBIGUOUS: "This payment is in an uncertain state at eSewa — please contact the firm to resolve it.",
    FULL_REFUND: "This transaction was refunded.",
    PARTIAL_REFUND: "This transaction was partially refunded.",
};

const DUPLICATE_KEY_ERROR_CODE = 11000;

function requireConfig(settings: { esewaEnabled: boolean; esewaClientId: string; esewaSecretEncrypted: string }) {
    if (!settings.esewaEnabled) {
        throw new HttpException(400, "Online payment is not currently enabled");
    }
    if (!settings.esewaClientId || !settings.esewaSecretEncrypted) {
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

function sign(message: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

/**
 * eSewa's "ePay v2" hosted-checkout flow, replacing the earlier native-SDK
 * design. The merchant secret signs every request server-side and never
 * reaches the client — a real fix, not just a style change, over the
 * previous design where the client needed the secret itself to open the
 * native SDK's payment sheet. The client's only job is to POST the signed
 * fields returned by initiate() to eSewa's hosted page (e.g. via a WebView)
 * and report back the transaction_uuid it was given — verifyAndRecord()
 * never trusts anything else the client says about the outcome.
 */
export class EsewaPaymentService {
    /** Builds a signed, ready-to-POST form for one invoice's outstanding
     * balance. Nothing is written to the database here — a payment only
     * exists once verifyAndRecord() independently confirms it with eSewa. */
    async initiate(
        invoiceId: string,
        requestingUser: { role: string; email: string; userId: string }
    ): Promise<EsewaPaymentIntent> {
        const settings = await firmSettingsRepository.get();
        requireConfig(settings);

        const invoice = await invoiceService.assertAccess(invoiceId, requestingUser);
        const remaining = remainingBalanceOf(invoice);

        const secret = decryptSecret(settings.esewaSecretEncrypted);
        const productCode = settings.esewaClientId;
        // Alphanumeric + hyphen only, per eSewa's transaction_uuid rule —
        // invoiceId (a Mongo ObjectId hex string) and Date.now() both
        // qualify; the timestamp also makes every attempt unique so a
        // retried payment on the same invoice never collides at eSewa.
        const transactionUuid = `${invoiceId}-${Date.now()}`;
        const amount = remaining.toFixed(2);

        const signature = sign(`total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${productCode}`, secret);

        const formUrl =
            settings.esewaEnvironment === "live"
                ? "https://epay.esewa.com.np/api/epay/main/v2/form"
                : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

        // A custom URL scheme, not a real hosted page — the mobile client
        // intercepts navigation to it inside the WebView (it will never
        // actually resolve) purely to learn the outcome + transaction_uuid,
        // then always calls verifyAndRecord() rather than trusting this URL.
        const callback = (outcome: "success" | "failure") =>
            `lexcore://esewa-callback?outcome=${outcome}&transactionUuid=${encodeURIComponent(transactionUuid)}`;

        return {
            formUrl,
            fields: {
                amount,
                tax_amount: "0.00",
                total_amount: amount,
                transaction_uuid: transactionUuid,
                product_code: productCode,
                product_service_charge: "0.00",
                product_delivery_charge: "0.00",
                success_url: callback("success"),
                failure_url: callback("failure"),
                signed_field_names: SIGNED_FIELD_NAMES,
                signature,
            },
        };
    }

    /**
     * The client only ever reports a transaction_uuid — never an amount or
     * a claimed outcome. This recomputes the invoice's current outstanding
     * balance itself and asks eSewa's own status-check endpoint whether a
     * COMPLETE payment exists for that exact (product_code, transaction_uuid,
     * total_amount) triple. If the invoice changed between initiate() and
     * this call (e.g. another payment landed first), the recomputed amount
     * won't match what eSewa has on record and the lookup legitimately fails
     * closed rather than trusting a stale figure.
     */
    async verifyAndRecord(
        invoiceId: string,
        transactionUuid: string,
        requestingUser: { role: string; email: string; userId: string }
    ): Promise<IInvoice> {
        const settings = await firmSettingsRepository.get();
        requireConfig(settings);

        const invoice = await invoiceService.assertAccess(invoiceId, requestingUser);
        const remaining = remainingBalanceOf(invoice);

        const productCode = settings.esewaClientId;
        const amount = remaining.toFixed(2);

        const base = settings.esewaEnvironment === "live" ? "https://esewa.com.np" : "https://rc.esewa.com.np";
        const url = `${base}/api/epay/transaction/status/?product_code=${encodeURIComponent(productCode)}&total_amount=${encodeURIComponent(amount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

        let response: globalThis.Response;
        try {
            response = await fetch(url);
        } catch {
            throw new HttpException(502, "Could not reach eSewa to verify this payment — try again shortly");
        }
        if (!response.ok) {
            throw new HttpException(502, "eSewa verification request failed");
        }

        const record = (await response.json().catch(() => null)) as EsewaStatusResponse | null;
        if (!record || record.transaction_uuid !== transactionUuid || record.product_code !== productCode) {
            throw new HttpException(400, "eSewa did not recognize this transaction");
        }
        if (record.status !== "COMPLETE") {
            throw new HttpException(400, STATUS_MESSAGES[record.status] ?? "eSewa did not confirm this payment as complete");
        }
        if (!record.ref_id) {
            throw new HttpException(400, "eSewa confirmed this payment without a reference id");
        }

        const alreadyRecorded = await PaymentModel.exists({ gatewayRef: record.ref_id });
        if (alreadyRecorded) throw new HttpException(400, "This transaction has already been recorded");

        const verifiedAmount = Math.round(record.total_amount * 100) / 100;
        if (!(verifiedAmount > 0) || verifiedAmount > remaining + 0.01) {
            throw new HttpException(400, "Verified payment amount does not match the outstanding balance");
        }

        try {
            return await invoiceService.recordPayment(
                invoiceId,
                { amount: verifiedAmount, method: "esewa", notes: `Paid via eSewa (ref ${record.ref_id})` },
                requestingUser.userId,
                record.ref_id
            );
        } catch (error: any) {
            if (error?.code === DUPLICATE_KEY_ERROR_CODE) {
                throw new HttpException(400, "This transaction has already been recorded");
            }
            throw error;
        }
    }
}
