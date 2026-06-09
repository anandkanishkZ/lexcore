import { Request, Response } from "express";
import { z } from "zod";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import { UserService } from "../services/user.service";
import { ApiResponseHelper } from "../utils/apihelper.util";

const userService = new UserService();

export class UserController {
    async createUser(req: Request, res: Response) {
        try {
            const parsed = CreateUserDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map(e => e.message).join(", "), 400);
            }
            const user = await userService.createUser(parsed.data);
            return ApiResponseHelper.success(res, user, "User registered successfully", 201);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async loginUser(req: Request, res: Response) {
        try {
            const parsed = LoginUserDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map(e => e.message).join(", "), 400);
            }
            const result = await userService.loginUser(parsed.data);
            return ApiResponseHelper.success(res, result, "Login successful", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
