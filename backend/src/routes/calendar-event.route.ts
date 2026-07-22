import { Router } from "express";
import { CalendarEventController } from "../controllers/calendar-event.controller";
import { authorizedMiddleware, staffMiddleware } from "../middlewares/authorized.middleware";

const calendarEventRouter = Router();
const calendarEventController = new CalendarEventController();

calendarEventRouter.use(authorizedMiddleware);

// /mine must be registered before /:id so Express doesn't treat "mine" as an
// id. Open to any authenticated user — a client reads their own cases'
// hearings this way; ownership is enforced in CalendarEventService.getMine
// (resolved via their own case ids, never an arbitrary id). Everything else
// stays staff-only — the firm calendar isn't otherwise client-visible.
calendarEventRouter.get("/mine", calendarEventController.getMine);
calendarEventRouter.get("/:id", staffMiddleware, calendarEventController.getById);
calendarEventRouter.get("/", staffMiddleware, calendarEventController.getAll);
calendarEventRouter.post("/", staffMiddleware, calendarEventController.create);
calendarEventRouter.put("/:id", staffMiddleware, calendarEventController.update);
calendarEventRouter.delete("/:id", staffMiddleware, calendarEventController.delete);

export default calendarEventRouter;
