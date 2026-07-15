import { InvoiceService } from "./invoice.service";
import { FirmSettingsMongoRepository } from "../repositories/firm-settings.repository";
import { decryptSecret } from "../utils/crypto.util";
import { HttpException } from "../exceptions/http-exception";
import { PaymentModel } from "../models/payment.model";
import { IInvoice } from "../models/invoice.model";

const firmSettingsRepository = new FirmSettingsMongoRepository();
const invoiceService = new InvoiceService();

/** Shape of the array eSewa's mobile transaction-verification endpoint
 * returns — see the "Transaction Verification" section of the SDK docs.
 * Only the fields this service actually reads are declared. */
interface EsewaVerificationRecord {
    totalAmount: string;
    transactionDetails: {
        status: string;
        referenceId: string;
    };
}

const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * The mobile SDK only tells the *client* whether eSewa accepted the
 * payment — trusting that report and marking the invoice paid from the
 * client's word alone would let anyone with a valid session mark any of
 * their own invoices paid for free. This re-verifies the transaction
 * against eSewa's own server using credentials the client never sees, and
 * only records a Payment once eSewa itself confirms COMPLETE.
 */
export class EsewaPaymentService {
    async verifyAndRecord(
        invoiceId: string,
        refId: string,
        requestingUser: { role: string; email: string; userId: string }
    ): Promise<IInvoice> {
        const settings = await firmSettingsRepository.get();
        if (!settings.esewaEnabled) {
            throw new HttpException(400, "Online payment is not currently enabled");
        }
        if (!settings.esewaClientId || !settings.esewaSecretEncrypted) {
            throw new HttpException(500, "Online payment is not fully configured — contact the firm");
        }

        // Same admin-or-owning-client-by-email rule as GET /invoices/:id —
        // a client can only ever verify a payment against their own invoice.
        const invoice = await invoiceService.assertAccess(invoiceId, requestingUser);
        if (invoice.status === "paid") throw new HttpException(400, "This invoice is already fully paid");
        if (invoice.status === "void") throw new HttpException(400, "This invoice has been voided");

        const alreadyRecorded = await PaymentModel.exists({ gatewayRef: refId });
        if (alreadyRecorded) throw new HttpException(400, "This transaction has already been recorded");

        const secret = decryptSecret(settings.esewaSecretEncrypted);
        const base =
            settings.esewaEnvironment === "live"
                ? "https://esewa.com.np/mobile/transaction"
                : "https://rc.esewa.com.np/mobile/transaction";

        let response: globalThis.Response;
        try {
            response = await fetch(`${base}?txnRefId=${encodeURIComponent(refId)}`, {
                method: "GET",
                headers: {
                    merchantId: settings.esewaClientId,
                    merchantSecret: secret,
                    "Content-Type": "application/json",
                },
            });
        } catch {
            throw new HttpException(502, "Could not reach eSewa to verify this payment — try again shortly");
        }
        if (!response.ok) {
            throw new HttpException(502, "eSewa verification request failed");
        }

        const body = (await response.json().catch(() => null)) as EsewaVerificationRecord[] | null;
        const record = body?.[0];
        if (!record || record.transactionDetails?.status !== "COMPLETE") {
            throw new HttpException(400, "eSewa did not confirm this payment as complete");
        }
        // Belt-and-suspenders: the refId came from the client, but we only
        // ever trust the record eSewa's own server hands back for it.
        if (record.transactionDetails.referenceId !== refId) {
            throw new HttpException(400, "eSewa verification reference mismatch");
        }

        const remaining = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
        const verifiedAmount = Math.round(parseFloat(record.totalAmount) * 100) / 100;
        if (!(verifiedAmount > 0) || verifiedAmount > remaining + 0.01) {
            throw new HttpException(400, "Verified payment amount does not match the outstanding balance");
        }

        try {
            return await invoiceService.recordPayment(
                invoiceId,
                { amount: verifiedAmount, method: "esewa", notes: `Paid via eSewa (ref ${refId})` },
                requestingUser.userId,
                refId
            );
        } catch (error: any) {
            if (error?.code === DUPLICATE_KEY_ERROR_CODE) {
                throw new HttpException(400, "This transaction has already been recorded");
            }
            throw error;
        }
    }
}
