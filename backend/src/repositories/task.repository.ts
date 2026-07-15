import { TaskModel, ITask } from "../models/task.model";

export interface TaskQuery {
    status?: string;
    assignee?: string;
    case?: string;
}

export class TaskMongoRepository {
    async getAll(query: TaskQuery): Promise<ITask[]> {
        const filter: any = {};
        if (query.status) filter.status = query.status;
        if (query.assignee) filter.assignee = query.assignee;
        if (query.case) filter.case = query.case;

        // The frontend renders this as a single Kanban board / list, not a
        // paginated table, so it needs the whole relevant set rather than a
        // page of it — but "whole set" still needs a hard ceiling so a firm
        // with tens of thousands of tasks can't turn one request into an
        // unbounded scan-and-serialize.
        return TaskModel.find(filter)
            .populate("assignee", "firstName lastName email")
            .populate("case", "title caseNumber")
            .populate("createdBy", "firstName lastName")
            .sort({ createdAt: -1 })
            .limit(500);
    }

    async getById(id: string): Promise<ITask | null> {
        return TaskModel.findById(id)
            .populate("assignee", "firstName lastName email")
            .populate("case", "title caseNumber assignedAttorney")
            .populate("createdBy", "firstName lastName");
    }

    async create(data: Partial<ITask>): Promise<ITask> {
        return TaskModel.create(data);
    }

    async update(id: string, data: Partial<ITask>): Promise<ITask | null> {
        return TaskModel.findByIdAndUpdate(id, data, { new: true })
            .populate("assignee", "firstName lastName email")
            .populate("case", "title caseNumber");
    }

    async delete(id: string): Promise<boolean> {
        const deleted = await TaskModel.findByIdAndDelete(id);
        return !!deleted;
    }
}
