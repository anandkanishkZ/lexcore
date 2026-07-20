import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi/document";
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
import documentRequestRouter from "./routes/document-request.route";
import messageRouter from "./routes/message.route";
import aiRouter from "./routes/ai.route";
import reportRouter from "./routes/report.route";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import { captureException } from "./utils/error-tracking.util";
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

// Interactive API docs — generated from the same Zod schemas every route
// already validates requests against (src/openapi/), so the docs can't
// drift from what the DTOs actually accept the way hand-written docs would.
app.get("/api/v1/api-docs.json", (req: Request, res: Response) => res.json(openApiDocument));
app.use("/api/v1/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

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
app.use("/api/v1/document-requests", documentRequestRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/reports", reportRouter);

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
    captureException(error, { path: req.path, method: req.method });
    return ApiResponseHelper.error(res, "Internal Server Error", 500);
});

export default app;
export { PORT };
