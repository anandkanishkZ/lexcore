import { TaskMongoRepository, TaskQuery } from "../repositories/task.repository";
import { CreateTaskDTO, UpdateTaskDTO } from "../dtos/task.dto";
import { ITask } from "../models/task.model";
import { HttpException } from "../exceptions/http-exception";

const taskRepository = new TaskMongoRepository();

export class TaskService {
    async getAll(query: TaskQuery): Promise<ITask[]> {
        return taskRepository.getAll(query);
    }

    async getById(id: string): Promise<ITask> {
        const found = await taskRepository.getById(id);
        if (!found) throw new HttpException(404, "Task not found");
        return found;
    }

    async create(data: CreateTaskDTO, userId: string): Promise<ITask> {
        return taskRepository.create({
            title: data.title,
            description: data.description ?? "",
            priority: data.priority ?? "medium",
            status: data.status ?? "todo",
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            assignee: data.assignee ? (data.assignee as any) : undefined,
            case: data.case ? (data.case as any) : undefined,
            createdBy: userId as any,
        });
    }

    async update(id: string, data: UpdateTaskDTO): Promise<ITask> {
        const existing = await taskRepository.getById(id);
        if (!existing) throw new HttpException(404, "Task not found");

        const updatePayload: any = { ...data };
        if (data.dueDate) updatePayload.dueDate = new Date(data.dueDate);
        if (data.assignee !== undefined) updatePayload.assignee = data.assignee || null;
        if (data.case !== undefined) updatePayload.case = data.case || null;

        const updated = await taskRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update task");
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const existing = await taskRepository.getById(id);
        if (!existing) throw new HttpException(404, "Task not found");
        return taskRepository.delete(id);
    }
}
