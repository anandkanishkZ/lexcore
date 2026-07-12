"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { taskSchema, TaskFormData } from "./schema";
import { createTaskAction, updateTaskAction } from "@/lib/actions/task";

interface MemberOption {
    _id: string;
    firstName: string;
    lastName: string;
}

interface CaseOption {
    _id: string;
    title: string;
    caseNumber: string;
}

interface TaskFormModalProps {
    mode: "create" | "edit";
    taskId?: string;
    members: MemberOption[];
    cases: CaseOption[];
    defaultValues?: Partial<TaskFormData>;
    onClose: () => void;
    onSuccess: () => void;
}

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white";

export default function TaskFormModal({
    mode,
    taskId,
    members,
    cases,
    defaultValues,
    onClose,
    onSuccess,
}: TaskFormModalProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<TaskFormData>({
        resolver: zodResolver(taskSchema),
        defaultValues: { priority: "medium", status: "todo", ...defaultValues },
    });

    const onSubmit = (data: TaskFormData) => {
        setError("");
        const payload: any = { ...data };
        if (!payload.dueDate) delete payload.dueDate;
        if (!payload.assignee) delete payload.assignee;
        if (!payload.case) delete payload.case;
        if (!payload.description) delete payload.description;

        startTransition(async () => {
            const result = mode === "create" ? await createTaskAction(payload) : await updateTaskAction(taskId!, payload);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || `Failed to ${mode} task`);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">
                        {mode === "create" ? "New Task" : "Edit Task"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <p className="text-sm text-red-500 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                        <input type="text" {...register("title")} className={inputClass} />
                        {errors.title && <span className="mt-1 block text-xs text-red-500">{errors.title.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Description <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea {...register("description")} rows={3} className={`${inputClass} resize-none`} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
                            <select {...register("priority")} className={inputClass}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                            <select {...register("status")} className={inputClass}>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                            <input type="date" {...register("dueDate")} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Assignee</label>
                            <select {...register("assignee")} className={inputClass}>
                                <option value="">— Unassigned —</option>
                                {members.map((m) => (
                                    <option key={m._id} value={m._id}>
                                        {m.firstName} {m.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Linked Case <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <select {...register("case")} className={inputClass}>
                            <option value="">— None —</option>
                            {cases.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.title} ({c.caseNumber})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                        >
                            {isPending ? "Saving…" : mode === "create" ? "Create Task" : "Save Changes"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
