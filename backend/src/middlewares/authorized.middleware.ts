import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../configs/constant";
import { UserMongoRepository } from "../repositories/user.repository";
import { HttpException } from "../exceptions/http-exception";
import { ApiResponseHelper } from "../utils/apihelper.util";

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const userRepository = new UserMongoRepository();

export const authorizedMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            throw new HttpException(401, "Token not found");
        }
        const decoded = jwt.verify(token, SECRET_KEY) as any;
        const user = await userRepository.getUserById(decoded.id);
        if (!user) {
            throw new HttpException(401, "User not found");
        }
        req.user = user;
        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Unauthorized", 401);
    }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            throw new HttpException(403, "Access denied");
        }
        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Forbidden", 403);
    }
};

/**
 * Any staff member — `role: "admin"` (full access) OR any non-client
 * `userType` (attorney, paralegal, etc.). Distinct from adminMiddleware,
 * which is reserved for genuinely admin-only actions (user management, firm
 * settings, deleting other people's records). Without this, a staff account
 * created with `role: "user"` (the schema default when unset) could sign in
 * but couldn't use the console at all — every route required full admin.
 */
export const staffMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.userType === "client")) {
            throw new HttpException(403, "Access denied");
        }
        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Forbidden", 403);
    }
};
