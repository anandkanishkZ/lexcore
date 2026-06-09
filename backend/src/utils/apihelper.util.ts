import { Response } from "express";

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}

export interface ApiResponse<T> {
    status: number;
    success: boolean;
    message: string;
    data: T;
    meta?: PaginationMeta;
}

export class ApiResponseHelper {
    static success<T>(
        res: Response,
        data: T,
        message: string = "Success",
        status: number = 200,
        meta?: PaginationMeta
    ): Response {
        const response: ApiResponse<T> = { status, success: true, message, data, meta };
        return res.status(status).json(response);
    }

    static error(
        res: Response,
        message: string = "Error",
        status: number = 500,
        data?: null
    ): Response {
        const response: ApiResponse<null> = { status, success: false, message, data };
        return res.status(status).json(response);
    }
}
