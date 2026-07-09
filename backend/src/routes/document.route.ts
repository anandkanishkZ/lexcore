import { Router, Request, Response, NextFunction } from "express";
import { DocumentController } from "../controllers/document.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { caseFileUpload } from "../middlewares/case-file-upload.middleware";
import { CaseService } from "../services/case.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";

const documentRouter = Router();
const documentController = new DocumentController();
const caseService = new CaseService();

// Runs before caseFileUpload so a non-owner is rejected before multer writes
// anything to disk — see the comment in case-file-upload.middleware.ts.
async function requireCaseQueryAccess(req: Request, res: Response, next: NextFunction) {
    try {
        const caseId = (req.query.case as string) || "";
        if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
        const user = req.user as IUser;
        await caseService.assertAccess(caseId, { role: user.role, email: user.email });
        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Access denied", error.status || 403);
    }
}

documentRouter.use(authorizedMiddleware);

documentRouter.get("/", documentController.list);
documentRouter.post("/folders", documentController.createFolder);
documentRouter.post("/", requireCaseQueryAccess, caseFileUpload.single("file"), documentController.upload);
documentRouter.get("/:id/download", documentController.download);
documentRouter.delete("/folders/:id", documentController.deleteFolder);
documentRouter.delete("/:id", documentController.deleteFile);

export default documentRouter;
