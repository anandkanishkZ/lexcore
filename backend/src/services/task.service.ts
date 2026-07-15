import { TaskMongoRepository, TaskQuery } from "../repositories/task.repository";
import { UserMongoRepository } from "../repositories/user.repository";
import { CreateTaskDTO, UpdateTaskDTO } from "../dtos/task.dto";
import { ITask } from "../models/task.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";

const taskRepository = new TaskMongoRepository();
const userRepository = new UserMongoRepository();

type RequestingUser = { role: string; userId: string };

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

    async update(id: string, data: UpdateTaskDTO, requestingUser?: RequestingUser): Promise<ITask> {
        const existing = await taskRepository.getById(id);
        if (!existing) throw new HttpException(404, "Task not found");
        if (requestingUser) this.assertMutationAccess(existing, requestingUser);

        if (data.assignee) await this.assertValidAssignee(data.assignee);

        const updatePayload: any = { ...data };
        if (data.dueDate) updatePayload.dueDate = new Date(data.dueDate);
        if (data.assignee !== undefined) updatePayload.assignee = data.assignee || null;
        if (data.case !== undefined) updatePayload.case = data.case || null;

        const updated = await taskRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update task");

        if (requestingUser) {
            await logAudit({
                actorId: requestingUser.userId,
                action: "task.update",
                entityType: "Task",
                entityId: id,
                metadata: existing.title,
            });
        }

        return updated;
    }

    async delete(id: string, requestingUser?: RequestingUser): Promise<boolean> {
        const existing = await taskRepository.getById(id);
        if (!existing) throw new HttpException(404, "Task not found");
        if (requestingUser) this.assertMutationAccess(existing, requestingUser);

        const deleted = await taskRepository.delete(id);
        if (deleted && requestingUser) {
            await logAudit({
                actorId: requestingUser.userId,
                action: "task.delete",
                entityType: "Task",
                entityId: id,
                metadata: existing.title,
            });
        }
        return deleted;
    }

    /**
     * Was fully unscoped for any staff — any attorney could edit/delete any
     * other attorney's task on any case, firm-wide. Tasks can exist with no
     * case at all (a firm-wide to-do), so this can't reuse Case's
     * assignedAttorney-only rule wholesale: a non-admin may mutate a task
     * they're the assignee OR creator of, OR (if the task is case-linked)
     * the assigned attorney on that case. Listing/viewing tasks stays
     * unscoped for staff, matching how GET /cases already works — only
     * mutation is newly restricted here.
     */
    private assertMutationAccess(task: ITask, requestingUser: RequestingUser): void {
        if (requestingUser.role === "admin") return;

        const assignee = task.assignee as unknown as { _id?: { toString(): string } } | null;
        if (assignee?._id?.toString() === requestingUser.userId) return;

        const createdBy = task.createdBy as unknown as { _id?: { toString(): string } } | null;
        if (createdBy?._id?.toString() === requestingUser.userId) return;

        const relatedCase = task.case as unknown as { assignedAttorney?: { toString(): string } } | null;
        if (relatedCase?.assignedAttorney?.toString() === requestingUser.userId) return;

        throw new HttpException(403, "You can only edit or delete tasks assigned to you, created by you, or on a case you're assigned to");
    }
}
