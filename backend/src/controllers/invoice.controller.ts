import { Request, Response } from "express";
import { CreateInvoiceDTO, UpdateInvoiceDTO, RecordPaymentDTO, VerifyEsewaPaymentDTO } from "../dtos/invoice.dto";
import { InvoiceService } from "../services/invoice.service";
import { EsewaPaymentService } from "../services/esewa-payment.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const invoiceService = new InvoiceService();
const esewaPaymentService = new EsewaPaymentService();

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

    /** Client-facing: called by the mobile app after the eSewa SDK reports
     * success. Never trusts that report alone — the service re-verifies
     * against eSewa's own server before recording anything. */
    async verifyEsewaPayment(req: Request, res: Response) {
        try {
            const parsed = VerifyEsewaPaymentDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = req.user as IUser;
            const updated = await esewaPaymentService.verifyAndRecord(req.params.id as string, parsed.data.refId, {
                role: user.role,
                email: user.email,
                userId: user._id.toString(),
            });
            return ApiResponseHelper.success(res, updated, "Payment verified and recorded successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "InvoiceController");
        }
    }
}
