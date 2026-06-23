import { Request, Response } from "express";
import { z } from "zod";
import { CreateUserDTO, LoginUserDTO } from "../dtos/user.dto";
import { UserService } from "../services/user.service";
import { toPublicUser, IUser } from "../models/user.model";
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

    /**
     * Returns the authenticated user's own profile. Protected by
     * authorizedMiddleware, which verifies the Bearer token and attaches the
     * user to req.user. Mapped through toPublicUser so the password never leaks.
     */
    async getMe(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            return ApiResponseHelper.success(res, toPublicUser(user), "Current user", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    /**
     * Uploads/replaces the authenticated user's profile picture. Protected and
     * runs after multer's upload.single("image"), so req.file holds the saved
     * file. Stores the public path on the user and returns the updated profile.
     */
    async uploadProfileImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                return ApiResponseHelper.error(res, "No image file provided", 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const imagePath = `/uploads/${req.file.filename}`;
            const user = await userService.updateProfileImage(userId, imagePath);
            return ApiResponseHelper.success(res, user, "Profile image updated", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
