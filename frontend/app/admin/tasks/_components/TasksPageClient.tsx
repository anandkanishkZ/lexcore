"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { List, Kanban, Plus } from "lucide-react";
import TasksTable, { type TaskRow } from "./TasksTable";
import TasksBoard from "./TasksBoard";
import TaskFormModal from "./TaskFormModal";

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

export default function TasksPageClient({
    tasks,
    members,
    cases,
}: {
    tasks: TaskRow[];
    members: MemberOption[];
    cases: CaseOption[];
}) {
    const router = useRouter();
    const [view, setView] = useState<"list" | "board">("list");
    const [modalState, setModalState] = useState<{ mode: "create" | "edit"; task?: TaskRow } | null>(null);

    const refresh = () => {
        setModalState(null);
        router.refresh();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <p className="text-sm text-slate-500">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <button
                            onClick={() => setView("list")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            List
                        </button>
                        <button
                            onClick={() => setView("board")}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                view === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            <Kanban className="w-3.5 h-3.5" />
                            Board
                        </button>
                    </div>
                    <button
                        onClick={() => setModalState({ mode: "create" })}
                        className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm font-medium text-slate-700">No tasks yet</p>
                    <p className="text-xs text-slate-500 mt-1">Create your first task to get started.</p>
                </div>
            ) : view === "list" ? (
                <TasksTable tasks={tasks} onEdit={(task) => setModalState({ mode: "edit", task })} onChanged={refresh} />
            ) : (
                <TasksBoard tasks={tasks} onEdit={(task) => setModalState({ mode: "edit", task })} />
            )}

            {modalState && (
                <TaskFormModal
                    mode={modalState.mode}
                    taskId={modalState.task?._id}
                    members={members}
                    cases={cases}
                    defaultValues={
                        modalState.task
                            ? {
                                  title: modalState.task.title,
                                  priority: modalState.task.priority as "low" | "medium" | "high",
                                  status: modalState.task.status as "todo" | "in_progress" | "done",
                                  dueDate: modalState.task.dueDate ? modalState.task.dueDate.slice(0, 10) : undefined,
                                  assignee: modalState.task.assignee?._id ?? undefined,
                                  case: modalState.task.case?._id ?? undefined,
                              }
                            : undefined
                    }
                    onClose={() => setModalState(null)}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
}
