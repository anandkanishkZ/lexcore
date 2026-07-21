import { Request, Response } from "express";
import { CreateTaskDTO, UpdateTaskDTO } from "../dtos/task.dto";
import { TaskService } from "../services/task.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const taskService = new TaskService();

export class TaskController {
    async getAll(req: Request, res: Response) {
        try {
            const status = (req.query.status as string) || undefined;
            const assignee = (req.query.assignee as string) || undefined;
            const caseId = (req.query.case as string) || undefined;
            const client = (req.query.client as string) || undefined;
            const data = await taskService.getAll({ status, assignee, case: caseId, client });
            return ApiResponseHelper.success(res, data, "Tasks fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "TaskController");
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const found = await taskService.getById(req.params.id as string);
            return ApiResponseHelper.success(res, found, "Task fetched successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "TaskController");
        }
    }

    async create(req: Request, res: Response) {
        try {
            const parsed = CreateTaskDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const userId = (req.user as IUser)._id.toString();
            const created = await taskService.create(parsed.data, userId);
            return ApiResponseHelper.success(res, created, "Task created successfully", 201);
        } catch (error: any) {
            return handleControllerError(res, error, "TaskController");
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateTaskDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const user = req.user as IUser;
            const updated = await taskService.update(req.params.id as string, parsed.data, {
                role: user.role,
                userId: user._id.toString(),
            });
            return ApiResponseHelper.success(res, updated, "Task updated successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "TaskController");
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const user = req.user as IUser;
            await taskService.delete(req.params.id as string, { role: user.role, userId: user._id.toString() });
            return ApiResponseHelper.success(res, null, "Task deleted successfully", 200);
        } catch (error: any) {
            return handleControllerError(res, error, "TaskController");
        }
    }
}
