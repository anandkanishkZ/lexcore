import { Request, Response } from "express";
import { AdminCreateUserDTO, AdminUpdateUserDTO } from "../dtos/user.dto";
import { UserService } from "../services/user.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { HttpException } from "../exceptions/http-exception";

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
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const user = await userService.getById(req.params.id as string);
            return ApiResponseHelper.success(res, user, "User fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = AdminCreateUserDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = await userService.adminCreateUser(parsed.data);
            return ApiResponseHelper.success(res, user, "User created successfully", 201);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = AdminUpdateUserDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = await userService.adminUpdateUser(req.params.id as string, parsed.data);
            return ApiResponseHelper.success(res, user, "User updated successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const requester = req.user as IUser;
            if (requester._id.toString() === id) {
                throw new HttpException(400, "You cannot delete your own account");
            }
            await userService.deleteUser(id);
            return ApiResponseHelper.success(res, null, "User deleted successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
