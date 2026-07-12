import { z } from "zod";
import { CalendarEventSchema } from "../types/calendar-event.type";

export const CreateCalendarEventDTO = CalendarEventSchema;
export type CreateCalendarEventDTO = z.infer<typeof CreateCalendarEventDTO>;

export const UpdateCalendarEventDTO = CalendarEventSchema.partial();
export type UpdateCalendarEventDTO = z.infer<typeof UpdateCalendarEventDTO>;
