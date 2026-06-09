import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import userRouter from "./routes/user.route";
import { HttpException } from "./exceptions/http-exception";
import { ApiResponseHelper } from "./utils/apihelper.util";
import { PORT } from "./configs/constant";

const app: Express = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

app.use("/api/v1/auth", userRouter);

app.use((req: Request, res: Response) => {
    ApiResponseHelper.error(res, "API not found", 404);
});

app.use((error: HttpException | Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof HttpException) {
        return ApiResponseHelper.error(res, error.message, error.status);
    }
    return ApiResponseHelper.error(res, "Internal Server Error", 500);
});

export default app;
export { PORT };
