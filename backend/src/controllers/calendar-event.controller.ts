import { Request, Response } from "express";
import { CreateCalendarEventDTO, UpdateCalendarEventDTO } from "../dtos/calendar-event.dto";
import { CalendarEventService } from "../services/calendar-event.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const calendarEventService = new CalendarEventService();

export class CalendarEventController {
    async getAll(req: Request, res: Response) {
        try {
            const from = (req.query.from as string) || undefined;
            const to = (req.query.to as string) || undefined;
            const caseId = (req.query.case as string) || undefined;
            const data = await calendarEventService.getAll({ from, to, case: caseId });
            return ApiResponseHelper.success(res, data, "Events fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CalendarEventController");
        }
    }

    async getMine(req: Request, res: Response) {
        try {
            const email = (req.user as IUser).email;
            const data = await calendarEventService.getMine(email);
            return ApiResponseHelper.success(res, data, "Hearings fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CalendarEventController");
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const found = await calendarEventService.getById(req.params.id as string);
            return ApiResponseHelper.success(res, found, "Event fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CalendarEventController");
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = CreateCalendarEventDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const created = await calendarEventService.create(parsed.data, userId);
            return ApiResponseHelper.success(res, created, "Event created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "CalendarEventController");
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateCalendarEventDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const actorId = (req.user as IUser)._id.toString();
            const updated = await calendarEventService.update(req.params.id as string, parsed.data, actorId);
            return ApiResponseHelper.success(res, updated, "Event updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CalendarEventController");
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const actorId = (req.user as IUser)._id.toString();
            await calendarEventService.delete(req.params.id as string, actorId);
            return ApiResponseHelper.success(res, null, "Event deleted successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "CalendarEventController");
        }
    }
}
