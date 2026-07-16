import type { StatusTone } from "../../_components/StatusBadge";

export const taskStatuses = ["todo", "in_progress", "done"] as const;

export const statusLabel: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
};

export const statusTone: Record<string, StatusTone> = {
    todo: "neutral",
    in_progress: "warning",
    done: "success",
};

export const priorityLabel: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
};

export const priorityTone: Record<string, StatusTone> = {
    low: "neutral",
    medium: "info",
    high: "danger",
};
