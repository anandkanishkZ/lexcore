import { CalendarEventModel, ICalendarEvent } from "../models/calendar-event.model";

export interface CalendarEventQuery {
    from?: string;
    to?: string;
    case?: string;
}

export class CalendarEventMongoRepository {
    async getAll(query: CalendarEventQuery): Promise<ICalendarEvent[]> {
        const filter: any = {};
        if (query.from || query.to) {
            filter.date = {};
            if (query.from) filter.date.$gte = new Date(query.from);
            if (query.to) filter.date.$lte = new Date(query.to);
        }
        if (query.case) filter.case = query.case;

        // Normally date-range-scoped by the frontend's month view (naturally
        // small), but a caller that omits from/to should still get a bounded
        // result instead of the entire collection.
        return CalendarEventModel.find(filter)
            .populate("case", "title caseNumber")
            .populate("participants", "firstName lastName email")
            .populate("createdBy", "firstName lastName")
            .sort({ date: 1 })
            .limit(500);
    }

    async getById(id: string): Promise<ICalendarEvent | null> {
        return CalendarEventModel.findById(id)
            .populate("case", "title caseNumber")
            .populate("participants", "firstName lastName email")
            .populate("createdBy", "firstName lastName");
    }

    async create(data: Partial<ICalendarEvent>): Promise<ICalendarEvent> {
        return CalendarEventModel.create(data);
    }

    async update(id: string, data: Partial<ICalendarEvent>): Promise<ICalendarEvent | null> {
        return CalendarEventModel.findByIdAndUpdate(id, data, { new: true })
            .populate("case", "title caseNumber")
            .populate("participants", "firstName lastName email");
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await CalendarEventModel.findByIdAndDelete(id);
        return !!deleted;
    }
}
