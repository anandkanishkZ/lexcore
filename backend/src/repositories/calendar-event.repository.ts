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

    /** Every hearing across a set of cases — the client-facing "my hearings"
     * feed. Filtered to type: "hearing" server-side so a client's own
     * internal-only calendar events (meetings, deadlines) never leak through
     * a case they happen to own. */
    async getMineForCases(caseIds: string[]): Promise<ICalendarEvent[]> {
        if (caseIds.length === 0) return [];
        return CalendarEventModel.find({ case: { $in: caseIds }, type: "hearing" })
            .populate("case", "title caseNumber")
            .sort({ date: 1 })
            .limit(200);
    }

    /** Hearings whose date falls within [from, to) and haven't had their
     * reminder sent yet — used by the daily reminder cron sweep. */
    async findUnremindedHearingsInWindow(from: Date, to: Date): Promise<ICalendarEvent[]> {
        return CalendarEventModel.find({
            type: "hearing",
            date: { $gte: from, $lt: to },
            reminderSent: { $ne: true },
        }).populate({
            path: "case",
            select: "title caseNumber client",
            populate: { path: "client", select: "email linkedUserId" },
        });
    }

    async markReminderSent(id: string): Promise<void> {
        await CalendarEventModel.updateOne({ _id: id }, { $set: { reminderSent: true } });
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
