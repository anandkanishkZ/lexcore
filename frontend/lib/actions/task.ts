"use server";

import { fetchTasksApi, createTaskApi, updateTaskApi, deleteTaskApi } from "../api/task";
import { getTokenCookie } from "../cookies";
import { revalidatePath } from "next/cache";

export async function fetchTasksAction(status?: string, assignee?: string, caseId?: string, client?: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        return await fetchTasksApi(token, status, assignee, caseId, client);
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to fetch tasks" };
    }
}

export async function createTaskAction(data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    assignee?: string;
    case?: string;
}) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await createTaskApi(token, data);
        if (result.success) revalidatePath("/admin/tasks");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to create task" };
    }
}

export async function updateTaskAction(
    id: string,
    data: {
        title?: string;
        description?: string;
        priority?: string;
        status?: string;
        dueDate?: string;
        assignee?: string;
        case?: string;
    }
) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await updateTaskApi(token, id, data);
        if (result.success) revalidatePath("/admin/tasks");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to update task" };
    }
}

export async function deleteTaskAction(id: string) {
    try {
        const token = await getTokenCookie();
        if (!token) return { success: false, message: "Not authenticated" };
        const result = await deleteTaskApi(token, id);
        if (result.success) revalidatePath("/admin/tasks");
        return result;
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to delete task" };
    }
}
