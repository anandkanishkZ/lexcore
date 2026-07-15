import { CalendarEventMongoRepository, CalendarEventQuery } from "../repositories/calendar-event.repository";
import { CreateCalendarEventDTO, UpdateCalendarEventDTO } from "../dtos/calendar-event.dto";
import { ICalendarEvent } from "../models/calendar-event.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";

const calendarEventRepository = new CalendarEventMongoRepository();

export class CalendarEventService {
    async getAll(query: CalendarEventQuery): Promise<ICalendarEvent[]> {
        return calendarEventRepository.getAll(query);
    }

    async getById(id: string): Promise<ICalendarEvent> {
        const found = await calendarEventRepository.getById(id);
        if (!found) throw new HttpException(404, "Event not found");
        return found;
    }

    async create(data: CreateCalendarEventDTO, userId: string): Promise<ICalendarEvent> {
        return calendarEventRepository.create({
            title: data.title,
            type: data.type ?? "meeting",
            date: new Date(data.date),
            time: data.time,
            duration: data.duration,
            location: data.location ?? "",
            notes: data.notes ?? "",
            case: data.case ? (data.case as any) : undefined,
            participants: (data.participants ?? []) as any,
            createdBy: userId as any,
        });
    }

    async update(id: string, data: UpdateCalendarEventDTO, actorId?: string): Promise<ICalendarEvent> {
        const existing = await calendarEventRepository.getById(id);
        if (!existing) throw new HttpException(404, "Event not found");

        const updatePayload: any = { ...data };
        if (data.date) updatePayload.date = new Date(data.date);
        if (data.case !== undefined) updatePayload.case = data.case || null;

        const updated = await calendarEventRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update event");

        if (actorId) {
            await logAudit({ actorId, action: "calendar-event.update", entityType: "CalendarEvent", entityId: id, metadata: existing.title });
        }

        return updated;
    }

    async delete(id: string, actorId?: string): Promise<boolean> {
        const existing = await calendarEventRepository.getById(id);
        if (!existing) throw new HttpException(404, "Event not found");
        const deleted = await calendarEventRepository.delete(id);
        if (deleted && actorId) {
            await logAudit({ actorId, action: "calendar-event.delete", entityType: "CalendarEvent", entityId: id, metadata: existing.title });
        }
        return deleted;
    }
}
