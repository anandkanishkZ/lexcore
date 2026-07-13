import { TaskMongoRepository, TaskQuery } from "../repositories/task.repository";
import { UserMongoRepository } from "../repositories/user.repository";
import { CreateTaskDTO, UpdateTaskDTO } from "../dtos/task.dto";
import { ITask } from "../models/task.model";
import { HttpException } from "../exceptions/http-exception";

const taskRepository = new TaskMongoRepository();
const userRepository = new UserMongoRepository();

export class TaskService {
    /** A task's assignee must be a staff account, never a client — mirrors
     * CaseService.assertValidAttorney. */
    private async assertValidAssignee(assigneeId: string): Promise<void> {
        const user = await userRepository.getUserById(assigneeId);
        if (!user) throw new HttpException(404, "Assignee not found");
        if (user.userType === "client") {
            throw new HttpException(400, "A client cannot be assigned a task");
        }
    }

    async getAll(query: TaskQuery): Promise<ITask[]> {
        return taskRepository.getAll(query);
    }

    async getById(id: string): Promise<ITask> {
        const found = await taskRepository.getById(id);
        if (!found) throw new HttpException(404, "Task not found");
        return found;
    }

    async create(data: CreateTaskDTO, userId: string): Promise<ITask> {
        if (data.assignee) await this.assertValidAssignee(data.assignee);

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

        if (data.assignee) await this.assertValidAssignee(data.assignee);

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
