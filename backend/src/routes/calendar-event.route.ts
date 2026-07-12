import { Router } from "express";
import { CalendarEventController } from "../controllers/calendar-event.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const calendarEventRouter = Router();
const calendarEventController = new CalendarEventController();

// Staff-only — the firm calendar isn't client-visible.
calendarEventRouter.use(authorizedMiddleware, staffMiddleware);

calendarEventRouter.get("/", calendarEventController.getAll);
calendarEventRouter.get("/:id", calendarEventController.getById);
calendarEventRouter.post("/", calendarEventController.create);
calendarEventRouter.put("/:id", calendarEventController.update);
calendarEventRouter.delete("/:id", calendarEventController.delete);

export default calendarEventRouter;
