import { Response } from "express";
import { ApiResponseHelper } from "./apihelper.util";
import { captureException } from "./error-tracking.util";

/**
 * Every controller catch block reduces to this shape. `error.status` is only
 * ever set by a deliberately-thrown `HttpException` ("Case not found",
 * "Access denied", etc.) — that message is safe and meant to reach the
 * client. Anything without a `.status` is an *unexpected* failure (a raw
 * Mongoose CastError, a bug), whose `.message` is internal detail that must
 * not leak over the API — so it's logged server-side instead and the client
 * gets a generic message.
 */
export function handleControllerError(res: Response, error: any, fallbackMessage: string): Response {
    const status = error?.status || 500;
    if (status >= 500) {
        console.error(`[${fallbackMessage}]`, error);
        captureException(error, { context: fallbackMessage });
        return ApiResponseHelper.error(res, "Something went wrong. Please try again.", 500);
    }
    return ApiResponseHelper.error(res, error?.message || fallbackMessage, status);
}
