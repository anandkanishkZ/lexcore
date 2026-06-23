import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import userRouter from "./routes/user.route";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import { UPLOAD_DIR } from "./middlewares/upload.middleware";
import { PORT } from "./configs/constant";

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

// Serve uploaded files (e.g. profile pictures) at /uploads/<filename>.
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api/v1/auth", userRouter);

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
    return ApiResponseHelper.error(res, "Internal Server Error", 500);
});

export default app;
export { PORT };
