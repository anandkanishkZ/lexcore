import { z } from "zod";

export const eventSchema = z.object({
    title: z.string().min(1, "Event title is required"),
    type: z.enum(["hearing", "meeting", "deadline", "reminder", "other"]),
    date: z.string().min(1, "Date is required"),
    time: z.string().optional(),
    location: z.string().optional(),
    notes: z.string().optional(),
    case: z.string().optional(),
});

export type EventFormData = z.infer<typeof eventSchema>;
