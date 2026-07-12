import { z } from "zod";
import { TaskSchema } from "../types/task.type";

export const CreateTaskDTO = TaskSchema;
export type CreateTaskDTO = z.infer<typeof CreateTaskDTO>;

export const UpdateTaskDTO = TaskSchema.partial();
export type UpdateTaskDTO = z.infer<typeof UpdateTaskDTO>;
