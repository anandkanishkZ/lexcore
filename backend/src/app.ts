import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import mongoose from "mongoose";
import userRouter from "./routes/user.route";
import clientRouter from "./routes/client.route";
import caseRouter from "./routes/case.route";
import memberRouter from "./routes/member.route";
import adminUserRouter from "./routes/admin-user.route";
import documentRouter from "./routes/document.route";
import caseRequestRouter from "./routes/case-request.route";
import taskRouter from "./routes/task.route";
import calendarEventRouter from "./routes/calendar-event.route";
import settingsRouter from "./routes/settings.route";
import notificationRouter from "./routes/notification.route";
import auditLogRouter from "./routes/audit-log.route";
import invoiceRouter from "./routes/invoice.route";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import { UPLOAD_DIR } from "./middlewares/upload.middleware";
import { PORT, CORS_ORIGINS } from "./configs/constant";

const app: Express = express();

// crossOriginResourcePolicy off — uploaded files (profile images, documents)
// are fetched cross-origin by the frontend/mobile app and must stay loadable.
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// Serve uploaded files (e.g. profile pictures) at /uploads/<filename>.
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/v1/health", (req: Request, res: Response) => {
    const dbConnected = mongoose.connection.readyState === 1;
    if (!dbConnected) {
        return ApiResponseHelper.error(res, "Database not connected", 503, null);
    }
    return ApiResponseHelper.success(res, { uptime: process.uptime(), database: "connected" }, "OK", 200);
});

app.use("/api/v1/auth", userRouter);
app.use("/api/v1/clients", clientRouter);
app.use("/api/v1/cases", caseRouter);
app.use("/api/v1/members", memberRouter);
app.use("/api/v1/admin/users", adminUserRouter);
app.use("/api/v1/documents", documentRouter);
app.use("/api/v1/case-requests", caseRequestRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/calendar-events", calendarEventRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/audit-logs", auditLogRouter);
app.use("/api/v1/invoices", invoiceRouter);

app.use((req: Request, res: Response) => {
    ApiResponseHelper.error(res, "API not found", 404);
});

app.use((error: HttpException | Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof HttpException) {
        return ApiResponseHelper.error(res, error.message, error.status);
    }
    // multer raises these for oversized/invalid uploads — surface as 400.
    if (error instanceof multer.MulterError) {
        return ApiResponseHelper.error(res, error.message, 400);
    }
    // Anything else is unexpected — log it server-side (nothing did before) and
    // keep the client-facing message generic, same rule as handleControllerError.
    console.error("[unhandled error]", error);
    return ApiResponseHelper.error(res, "Internal Server Error", 500);
});

export default app;
export { PORT };
