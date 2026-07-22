import { Request, Response } from "express";
import {
    CreateInvoiceDTO,
    UpdateInvoiceDTO,
    RecordPaymentDTO,
    VerifyEsewaPaymentDTO,
    InitiateEsewaIntentPaymentDTO,
    EsewaIntentCallbackDTO,
} from "../dtos/invoice.dto";
import { InvoiceService } from "../services/invoice.service";
import { EsewaPaymentService } from "../services/esewa-payment.service";
import { EsewaIntentPaymentService } from "../services/esewa-intent-payment.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const invoiceService = new InvoiceService();
const esewaPaymentService = new EsewaPaymentService();
const esewaIntentPaymentService = new EsewaIntentPaymentService();

export class InvoiceController {
    async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const status = (req.query.status as string) || undefined;
            const client = (req.query.client as string) || undefined;
            const caseId = (req.query.case as string) || undefined;

            const { data, total } = await invoiceService.getAll({ page, size, status, client, caseId });

            return ApiResponseHelper.success(res, data, "Invoices fetched successfully", 200, {
                page,
                limit: size,
                total,
            });
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            const found = await invoiceService.assertAccess(req.params.id as string, {
                role: user.role,
                email: user.email,
            });
            return ApiResponseHelper.success(res, found, "Invoice fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = CreateInvoiceDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const created = await invoiceService.create(parsed.data, userId);
            return ApiResponseHelper.success(res, created, "Invoice created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateInvoiceDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const actorId = (req.user as IUser)._id.toString();
            const updated = await invoiceService.update(req.params.id as string, parsed.data, actorId);
            return ApiResponseHelper.success(res, updated, "Invoice updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async voidInvoice(req: Request, res: Response) {
        try {
            const actorId = (req.user as IUser)._id.toString();
            const updated = await invoiceService.voidInvoice(req.params.id as string, actorId);
            return ApiResponseHelper.success(res, updated, "Invoice voided successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const actorId = (req.user as IUser)._id.toString();
            await invoiceService.delete(req.params.id as string, actorId);
            return ApiResponseHelper.success(res, null, "Invoice deleted successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async getMine(req: Request, res: Response) {
        try {
            const email = (req.user as IUser).email;
            const data = await invoiceService.getMine(email);
            return ApiResponseHelper.success(res, data, "My invoices fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async listPayments(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            await invoiceService.assertAccess(req.params.id as string, {
                role: user.role,
                email: user.email,
            });
            const data = await invoiceService.listPayments(req.params.id as string);
            return ApiResponseHelper.success(res, data, "Payments fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    async recordPayment(req: Request, res: Response) {
        try {
            const parsed = RecordPaymentDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const updated = await invoiceService.recordPayment(req.params.id as string, parsed.data, userId);
            return ApiResponseHelper.success(res, updated, "Payment recorded successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    /** Client-facing: builds a signed eSewa ePay v2 form for this invoice's
     * outstanding balance. The client POSTs the returned fields to
     * [formUrl] itself (a real page navigation, e.g. a WebView) — nothing
     * is recorded here, only prepared. */
    async initiateEsewaPayment(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            const intent = await esewaPaymentService.initiate(req.params.id as string, {
                role: user.role,
                email: user.email,
                userId: user._id.toString(),
            });
            return ApiResponseHelper.success(res, intent, "Payment initiated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    /** Client-facing: called after the client's eSewa checkout page
     * redirects back with a transaction_uuid. Never trusts that report
     * alone — the service re-verifies against eSewa's own server before
     * recording anything. */
    async verifyEsewaPayment(req: Request, res: Response) {
        try {
            const parsed = VerifyEsewaPaymentDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = req.user as IUser;
            const updated = await esewaPaymentService.verifyAndRecord(
                req.params.id as string,
                parsed.data.transactionUuid,
                { role: user.role, email: user.email, userId: user._id.toString() }
            );
            return ApiResponseHelper.success(res, updated, "Payment verified and recorded successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    /** Client-facing: books an Intent Payment transaction with eSewa and
     * returns a deeplink into the eSewa app. Nothing is recorded here — the
     * booking only becomes a Payment once eSewa's callback (or the status
     * poll below) reports SUCCESS. */
    async initiateEsewaIntentPayment(req: Request, res: Response) {
        try {
            const parsed = InitiateEsewaIntentPaymentDTO.safeParse(req.body ?? {});
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = req.user as IUser;
            const intent = await esewaIntentPaymentService.initiate(
                req.params.id as string,
                { role: user.role, email: user.email, userId: user._id.toString() },
                parsed.data.redirectUrl
            );
            return ApiResponseHelper.success(res, intent, "Payment booked successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    /** Client-facing fallback: polls eSewa's own status-check API when no
     * callback has landed yet (eSewa's own guidance is to check after ~5
     * minutes of silence). */
    async getEsewaIntentStatus(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            const transactionUuid = req.query.transactionUuid as string;
            if (!transactionUuid) {
                return ApiResponseHelper.error(res, "transactionUuid is required", 400);
            }
            const result = await esewaIntentPaymentService.getStatus(req.params.id as string, transactionUuid, {
                role: user.role,
                email: user.email,
            });
            return ApiResponseHelper.success(res, result, "Payment status fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }

    /** Unauthenticated — called by eSewa's own servers, not a logged-in
     * client. Signature-verified inside the service before anything is
     * trusted (see EsewaIntentPaymentService.handleCallback). */
    async esewaIntentCallback(req: Request, res: Response) {
        try {
            const parsed = EsewaIntentCallbackDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            await esewaIntentPaymentService.handleCallback(parsed.data);
            return ApiResponseHelper.success(res, null, "Callback processed", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }
}
