export const taskStatuses = ["todo", "in_progress", "done"] as const;

export const statusLabel: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    done: "Done",
};

export const statusStyles: Record<string, string> = {
    todo: "bg-slate-100 text-slate-600",
    in_progress: "bg-amber-50 text-amber-700",
    done: "bg-emerald-50 text-emerald-700",
};

export const priorityStyles: Record<string, string> = {
    low: "bg-slate-100 text-slate-500",
    medium: "bg-blue-50 text-blue-600",
    high: "bg-red-50 text-red-600",
};
