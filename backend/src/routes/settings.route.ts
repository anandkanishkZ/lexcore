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

// Any authenticated user, including clients — the mobile app's payment
// screen needs to know whether eSewa is on before it can launch the SDK, and
// clients are never staff. Returns no secret, so no elevated gate needed.
settingsRouter.get("/payment/esewa-config", firmSettingsController.getEsewaConfig);

// Any authenticated user — non-sensitive (name, currency), needed by the
// mobile app to format amounts using the firm's actual configured currency
// instead of a hardcoded one.
settingsRouter.get("/public", firmSettingsController.getPublicInfo);

export default settingsRouter;
