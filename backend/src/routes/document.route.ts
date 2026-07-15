import { Router, Request, Response, NextFunction } from "express";
import { DocumentController } from "../controllers/document.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";
import { caseFileUpload } from "../middlewares/case-file-upload.middleware";
import { CaseService } from "../services/case.service";
import { CaseFolderMongoRepository } from "../repositories/case-folder.repository";
import { CaseFileMongoRepository } from "../repositories/case-file.repository";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";

const documentRouter = Router();
const documentController = new DocumentController();
const caseService = new CaseService();
const folderRepository = new CaseFolderMongoRepository();
const fileRepository = new CaseFileMongoRepository();

// Runs before caseFileUpload so a non-owner is rejected before multer writes
// anything to disk — see the comment in case-file-upload.middleware.ts.
// Also validates ?folder=, if present, actually belongs to ?case= — without
// this, a caller with access to their own case could plant a file under an
// arbitrary folder id belonging to a case they have no access to.
async function requireCaseQueryAccess(req: Request, res: Response, next: NextFunction) {
    try {
        const caseId = (req.query.case as string) || "";
        if (!caseId) return ApiResponseHelper.error(res, "case is required", 400);
        const user = req.user as IUser;
        await caseService.assertAccess(caseId, { role: user.role, email: user.email });

        const folderId = req.query.folder as string | undefined;
        if (folderId) {
            const folder = await folderRepository.getById(folderId);
            if (!folder || folder.case.toString() !== caseId) {
                return ApiResponseHelper.error(res, "Invalid destination folder", 400);
            }
        }

        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Access denied", error.status || 403);
    }
}

// The versions route has no ?case= of its own — the file's case is already
// implied by :id — so multer's destination callback (which keys off
// req.query.case, see case-file-upload.middleware.ts) had nothing to read
// and fell back to a shared uploads/cases/unknown/ bucket for every new
// version, defeating per-case cleanup. This backfills it from the file's own
// record before multer runs. Access control for the upload itself still
// happens afterward in DocumentService.recordNewVersion (assertCanEditFile)
// — this middleware only 404s on a nonexistent file, it doesn't authorize.
async function resolveVersionCaseId(req: Request, res: Response, next: NextFunction) {
    try {
        const file = await fileRepository.getById(req.params.id as string);
        if (!file) return ApiResponseHelper.error(res, "File not found", 404);
        req.query.case = file.case.toString();
        next();
    } catch (error: any) {
        return ApiResponseHelper.error(res, error.message || "Upload failed", 500);
    }
}

documentRouter.use(authorizedMiddleware);

// Static/cross-case routes must be registered before the "/:id"-style routes
// below, the same discipline used for /cases/mine in case.route.ts.
documentRouter.get("/recent", documentController.recent);
documentRouter.get("/starred", documentController.starred);
documentRouter.get("/trash", documentController.trash);
documentRouter.get("/folders/all", documentController.moveTargets);

documentRouter.get("/", documentController.list);
documentRouter.post("/folders", documentController.createFolder);
documentRouter.post("/", requireCaseQueryAccess, caseFileUpload.single("file"), documentController.upload);

documentRouter.post("/:id/copy", documentController.copyFile);
documentRouter.post("/:id/restore", documentController.restoreFile);
documentRouter.post("/folders/:id/restore", documentController.restoreFolder);

documentRouter.patch("/:id", documentController.updateFile);
documentRouter.patch("/folders/:id", documentController.updateFolder);

documentRouter.get("/:id/download", documentController.download);

// Sharing and versioning: no route-level access middleware, same as
// /:id/download above — DocumentService checks case access OR a file-level
// share/editor grant, which requireCaseQueryAccess doesn't know how to do.
documentRouter.post("/:id/share", documentController.shareFile);
documentRouter.get("/:id/shares", documentController.listShares);
documentRouter.delete("/:id/shares/:shareId", documentController.revokeShare);

documentRouter.post("/:id/versions", resolveVersionCaseId, caseFileUpload.single("file"), documentController.uploadVersion);
documentRouter.get("/:id/versions", documentController.listVersions);
documentRouter.get("/:id/versions/:versionId/download", documentController.downloadVersion);

documentRouter.delete("/:id/permanent", documentController.permanentlyDeleteFile);
documentRouter.delete("/folders/:id/permanent", documentController.permanentlyDeleteFolder);
documentRouter.delete("/folders/:id", documentController.trashFolder);
documentRouter.delete("/:id", documentController.trashFile);

export default documentRouter;
