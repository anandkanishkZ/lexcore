import { z } from "zod";

export const taskSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]),
    status: z.enum(["todo", "in_progress", "done"]),
    dueDate: z.string().optional(),
    assignee: z.string().optional(),
    case: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;
