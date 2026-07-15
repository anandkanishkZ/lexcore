import { Request, Response } from "express";
import { z } from "zod";
import { AdminCreateUserDTO, AdminUpdateUserDTO } from "../dtos/user.dto";
import { UserService } from "../services/user.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";
import { handleControllerError } from "../utils/error-handler.util";

const userService = new UserService();

export class AdminUserController {
    async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = (req.query.search as string) || undefined;

            const { data, total } = await userService.getAll({ page, size, search });

            return ApiResponseHelper.success(res, data, "Users fetched successfully", 200, {
                page,
                limit: size,
                total,
            });
        } catch (error: any) {
            return handleControllerError(res, error, "AdminUserController");
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const user = await userService.getById(req.params.id as string);
            return ApiResponseHelper.success(res, user, "User fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "AdminUserController");
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = AdminCreateUserDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = await userService.adminCreateUser(parsed.data);
            await logAudit({
                actorId: (req.user as IUser)._id.toString(),
                action: "user.create",
                entityType: "User",
                entityId: user._id.toString(),
                metadata: `${user.firstName} ${user.lastName} <${user.email}> — ${user.userType}`,
            });
            return ApiResponseHelper.success(res, user, "User created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "AdminUserController");
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = AdminUpdateUserDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = await userService.adminUpdateUser(req.params.id as string, parsed.data);
            if (parsed.data.role || parsed.data.userType) {
                await logAudit({
                    actorId: (req.user as IUser)._id.toString(),
                    action: "user.role-change",
                    entityType: "User",
                    entityId: req.params.id as string,
                    metadata: `role=${parsed.data.role ?? "unchanged"}, userType=${parsed.data.userType ?? "unchanged"}`,
                });
            }
            return ApiResponseHelper.success(res, user, "User updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "AdminUserController");
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const requester = req.user as IUser;
            if (requester._id.toString() === id) {
                throw new HttpException(400, "You cannot delete your own account");
            }
            const target = await userService.getById(id);
            await userService.deleteUser(id);
            await logAudit({
                actorId: requester._id.toString(),
                action: "user.delete",
                entityType: "User",
                entityId: id,
                metadata: `${target.firstName} ${target.lastName} <${target.email}> — ${target.userType}`,
            });
            return ApiResponseHelper.success(res, null, "User deleted successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "AdminUserController");
        }
    }

    /** Deactivate/reactivate — the preferred alternative to delete for a
     * staff member who still has open work assigned (see deleteUser's
     * guard). Distinct from role-change: this doesn't touch userType/role. */
    async setActive(req: Request, res: Response) {
        try {
            const parsed = z.object({ isActive: z.boolean() }).safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const id = req.params.id as string;
            const requester = req.user as IUser;
            if (requester._id.toString() === id && !parsed.data.isActive) {
                throw new HttpException(400, "You cannot deactivate your own account");
            }
            const user = await userService.setActive(id, parsed.data.isActive);
            await logAudit({
                actorId: requester._id.toString(),
                action: parsed.data.isActive ? "user.reactivate" : "user.deactivate",
                entityType: "User",
                entityId: id,
                metadata: `${user.firstName} ${user.lastName} <${user.email}>`,
            });
            return ApiResponseHelper.success(res, user, "User status updated", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "AdminUserController");
        }
    }
}
