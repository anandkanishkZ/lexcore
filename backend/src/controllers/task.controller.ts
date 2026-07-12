import { Request, Response } from "express";
import { CreateTaskDTO, UpdateTaskDTO } from "../dtos/task.dto";
import { TaskService } from "../services/task.service";
import { IUser } from "../models/user.model";
import { ApiResponseHelper } from "../utils/apihelper.util";

const taskService = new TaskService();

export class TaskController {
    async getAll(req: Request, res: Response) {
        try {
            const status = (req.query.status as string) || undefined;
            const assignee = (req.query.assignee as string) || undefined;
            const caseId = (req.query.case as string) || undefined;
            const data = await taskService.getAll({ status, assignee, case: caseId });
            return ApiResponseHelper.success(res, data, "Tasks fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const found = await taskService.getById(req.params.id);
            return ApiResponseHelper.success(res, found, "Task fetched successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
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
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async update(req: Request, res: Response) {
        try {
            const parsed = UpdateTaskDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const updated = await taskService.update(req.params.id, parsed.data);
            return ApiResponseHelper.success(res, updated, "Task updated successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }

    async delete(req: Request, res: Response) {
        try {
            await taskService.delete(req.params.id);
            return ApiResponseHelper.success(res, null, "Task deleted successfully", 200);
        } catch (error: any) {
            return ApiResponseHelper.error(res, error.message || "Internal Server Error", error.status || 500);
        }
    }
}
