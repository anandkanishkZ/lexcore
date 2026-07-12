import { z } from "zod";

export const CalendarEventSchema = z.object({
    title: z.string().min(1, "Event title is required"),
    type: z.enum(["hearing", "meeting", "deadline", "reminder", "other"]).default("meeting"),
    date: z.string().min(1, "Date is required"),
    time: z.string().optional(),
    duration: z.number().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    case: z.string().optional(),
    participants: z.array(z.string()).optional(),
});

export type CalendarEventType = z.infer<typeof CalendarEventSchema>;
