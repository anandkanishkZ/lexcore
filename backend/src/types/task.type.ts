import { z } from "zod";

export const TaskSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    status: z.enum(["todo", "in_progress", "done"]).default("todo"),
    dueDate: z.string().optional(),
    assignee: z.string().optional(),
    case: z.string().optional(),
});

export type TaskType = z.infer<typeof TaskSchema>;
