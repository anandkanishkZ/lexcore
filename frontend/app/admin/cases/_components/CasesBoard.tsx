"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { updateCaseAction } from "@/lib/actions/case";
import { boardStatuses, statusLabel, statusStyles, typeLabel } from "./constants";
import type { CaseRow } from "./CasesTable";

function BoardCard({ c }: { c: CaseRow }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c._id });

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
            <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{c.caseNumber}</p>
            <p className="text-xs text-slate-500 mt-2 capitalize">{typeLabel[c.type] ?? c.type}</p>
            {c.client && (
                <p className="text-xs text-slate-400 mt-1 truncate">
                    {c.client.firstName} {c.client.lastName}
                </p>
            )}
            <Link
                href={`/admin/cases/${c._id}`}
                className="mt-2 inline-block text-xs font-medium text-brand-gold hover:underline"
                // Dragging is initiated by the whole card; stop the click from
                // firing a navigation while a drag gesture is in progress.
                onClick={(e) => isDragging && e.preventDefault()}
            >
                View
            </Link>
        </div>
    );
}

function BoardColumn({ status, cases }: { status: string; cases: CaseRow[] }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 min-w-64 rounded-2xl border p-3 transition ${
                isOver ? "border-brand-gold bg-amber-50/40" : "border-slate-200 bg-slate-50/60"
            }`}
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs capitalize ${
                        statusStyles[status] ?? "bg-slate-100 text-slate-600"
                    }`}
                >
                    {statusLabel[status] ?? status}
                </span>
                <span className="text-xs text-slate-400">{cases.length}</span>
            </div>
            <div className="space-y-2 min-h-16">
                {cases.map((c) => (
                    <BoardCard key={c._id} c={c} />
                ))}
            </div>
        </div>
    );
}

export default function CasesBoard({ cases }: { cases: CaseRow[] }) {
    const [localCases, setLocalCases] = useState(cases);
    // Reset local (optimistic) state whenever the server gives us a new
    // `cases` array — e.g. after a page navigation or revalidation. Adjusting
    // state during render (rather than in a useEffect) avoids an extra
    // render/flicker; see https://react.dev/learn/you-might-not-need-an-effect.
    const [prevCases, setPrevCases] = useState(cases);
    if (cases !== prevCases) {
        setPrevCases(cases);
        setLocalCases(cases);
    }
    const [, startTransition] = useTransition();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over) return;
        const newStatus = String(over.id);
        const caseId = String(active.id);
        const current = localCases.find((c) => c._id === caseId);
        if (!current || current.status === newStatus) return;

        const previous = localCases;
        setLocalCases((prev) => prev.map((c) => (c._id === caseId ? { ...c, status: newStatus } : c)));

        startTransition(async () => {
            const result = await updateCaseAction(caseId, { status: newStatus });
            if (!result.success) {
                // Revert on failure — e.g. a stale/deleted case.
                setLocalCases(previous);
            }
        });
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {boardStatuses.map((status) => (
                    <BoardColumn
                        key={status}
                        status={status}
                        cases={localCases.filter((c) => c.status === status)}
                    />
                ))}
            </div>
        </DndContext>
    );
}
