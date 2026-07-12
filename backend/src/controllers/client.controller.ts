import { Request, Response } from "express";
import { CreateClientDTO, UpdateClientDTO } from "../dtos/client.dto";
import { ClientService } from "../services/client.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { logAudit } from "../utils/audit-log.util";
import { handleControllerError } from "../utils/error-handler.util";

const clientService = new ClientService();

export class ClientController {
    async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = (req.query.search as string) || undefined;

            const { data, total } = await clientService.getAll({ page, size, search });

            return ApiResponseHelper.success(res, data, "Clients fetched successfully", 200, {
                page,
                limit: size,
                total,
            });
        } catch (error: any) {
            return handleControllerError(res, error, "ClientController");
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const client = await clientService.getById(id);
            return ApiResponseHelper.success(res, client, "Client fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "ClientController");
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = CreateClientDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const client = await clientService.create(parsed.data, userId);
            return ApiResponseHelper.success(res, client, "Client created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "ClientController");
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateClientDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const id = req.params.id as string;
            const client = await clientService.update(id, parsed.data);
            return ApiResponseHelper.success(res, client, "Client updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "ClientController");
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            await clientService.delete(id);
            await logAudit({
                actorId: (req.user as IUser)._id.toString(),
                action: "client.delete",
                entityType: "Client",
                entityId: id,
            });
            return ApiResponseHelper.success(res, null, "Client deleted successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "ClientController");
        }
    }
}
