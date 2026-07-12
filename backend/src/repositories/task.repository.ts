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

        return TaskModel.find(filter)
            .populate("assignee", "firstName lastName email")
            .populate("case", "title caseNumber")
            .populate("createdBy", "firstName lastName")
            .sort({ createdAt: -1 });
    }

    async getById(id: string): Promise<ITask | null> {
        return TaskModel.findById(id)
            .populate("assignee", "firstName lastName email")
            .populate("case", "title caseNumber")
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
