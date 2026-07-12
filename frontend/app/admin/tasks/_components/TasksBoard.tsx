"use client";

import { useState, useTransition } from "react";
import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { updateTaskAction } from "@/lib/actions/task";
import { taskStatuses, statusLabel, statusStyles, priorityStyles } from "./constants";
import type { TaskRow } from "./TasksTable";

function BoardCard({ t, onEdit }: { t: TaskRow; onEdit: (task: TaskRow) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: t._id });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{
                transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
                opacity: isDragging ? 0.4 : 1,
            }}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing touch-none"
        >
            <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
            <span
                className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs capitalize ${
                    priorityStyles[t.priority] ?? "bg-slate-100 text-slate-600"
                }`}
            >
                {t.priority}
            </span>
            {t.assignee && (
                <p className="text-xs text-slate-400 mt-2 truncate">
                    {t.assignee.firstName} {t.assignee.lastName}
                </p>
            )}
            <button
                onClick={(e) => {
                    if (isDragging) return;
                    e.stopPropagation();
                    onEdit(t);
                }}
                className="mt-2 inline-block text-xs font-medium text-brand-gold hover:underline"
            >
                Edit
            </button>
        </div>
    );
}

function BoardColumn({ status, tasks, onEdit }: { status: string; tasks: TaskRow[]; onEdit: (task: TaskRow) => void }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-64 rounded-2xl border p-3 transition ${
                isOver ? "border-brand-gold bg-amber-50/40" : "border-slate-200 bg-slate-50/60"
            }`}
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusStyles[status] ?? "bg-slate-100 text-slate-600"}`}>
                    {statusLabel[status] ?? status}
                </span>
                <span className="text-xs text-slate-400">{tasks.length}</span>
            </div>
            <div className="space-y-2 min-h-16">
                {tasks.map((t) => (
                    <BoardCard key={t._id} t={t} onEdit={onEdit} />
                ))}
            </div>
        </div>
    );
}

export default function TasksBoard({ tasks, onEdit }: { tasks: TaskRow[]; onEdit: (task: TaskRow) => void }) {
    const [localTasks, setLocalTasks] = useState(tasks);
    const [prevTasks, setPrevTasks] = useState(tasks);
    if (tasks !== prevTasks) {
        setPrevTasks(tasks);
        setLocalTasks(tasks);
    }
    const [, startTransition] = useTransition();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        const newStatus = String(over.id);
        const taskId = String(active.id);
        const current = localTasks.find((t) => t._id === taskId);
        if (!current || current.status === newStatus) return;

        const previous = localTasks;
        setLocalTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

        startTransition(async () => {
            const result = await updateTaskAction(taskId, { status: newStatus });
            if (!result.success) {
                setLocalTasks(previous);
            }
        });
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {taskStatuses.map((status) => (
                    <BoardColumn
                        key={status}
                        status={status}
                        tasks={localTasks.filter((t) => t.status === status)}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </DndContext>
    );
}
