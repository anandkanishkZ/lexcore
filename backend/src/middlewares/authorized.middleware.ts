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
