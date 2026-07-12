import { Router } from "express";
import { FirmSettingsController } from "../controllers/firm-settings.controller";
import { authorizedMiddleware, staffMiddleware, adminMiddleware } from "../middlewares/authorized.middleware";

const settingsRouter = Router();
const firmSettingsController = new FirmSettingsController();

settingsRouter.use(authorizedMiddleware);

// Any staff member may read firm settings (e.g. to display firm name);
// only admins may change them.
settingsRouter.get("/firm", staffMiddleware, firmSettingsController.get);
settingsRouter.put("/firm", adminMiddleware, firmSettingsController.update);

export default settingsRouter;
