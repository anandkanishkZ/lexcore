import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authorizedMiddleware } from "../middlewares/authorized.middleware";

const notificationRouter = Router();
const notificationController = new NotificationController();

// Any authenticated user reads/marks only their own notifications — no
// staff-vs-client distinction needed, the query is always scoped to req.user.
notificationRouter.use(authorizedMiddleware);

notificationRouter.get("/", notificationController.getMine);
notificationRouter.patch("/read-all", notificationController.markAllRead);
notificationRouter.patch("/:id/read", notificationController.markRead);
notificationRouter.post("/device-token", notificationController.registerDeviceToken);
notificationRouter.delete("/device-token", notificationController.unregisterDeviceToken);

export default notificationRouter;
