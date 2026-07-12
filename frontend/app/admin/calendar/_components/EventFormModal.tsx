"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { X, Trash2 } from "lucide-react";
import { eventSchema, EventFormData } from "./schema";
import { createCalendarEventAction, updateCalendarEventAction, deleteCalendarEventAction } from "@/lib/actions/calendar-event";

interface CaseOption {
    _id: string;
    title: string;
    caseNumber: string;
}

interface EventFormModalProps {
    mode: "create" | "edit";
    eventId?: string;
    cases: CaseOption[];
    defaultValues?: Partial<EventFormData>;
    onClose: () => void;
    onSuccess: () => void;
}

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition bg-white";

export default function EventFormModal({ mode, eventId, cases, defaultValues, onClose, onSuccess }: EventFormModalProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EventFormData>({
        resolver: zodResolver(eventSchema),
        defaultValues: { type: "meeting", ...defaultValues },
    });

    const onSubmit = (data: EventFormData) => {
        setError("");
        const payload: any = { ...data };
        if (!payload.time) delete payload.time;
        if (!payload.location) delete payload.location;
        if (!payload.notes) delete payload.notes;
        if (!payload.case) delete payload.case;

        startTransition(async () => {
            const result =
                mode === "create" ? await createCalendarEventAction(payload) : await updateCalendarEventAction(eventId!, payload);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || `Failed to ${mode} event`);
            }
        });
    };

    const handleDelete = () => {
        if (!eventId) return;
        setError("");
        startTransition(async () => {
            const result = await deleteCalendarEventAction(eventId);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.message || "Failed to delete event");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">
                        {mode === "create" ? "New Event" : "Edit Event"}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                            <select {...register("type")} className={inputClass}>
                                <option value="hearing">Hearing</option>
                                <option value="meeting">Meeting</option>
                                <option value="deadline">Deadline</option>
                                <option value="reminder">Reminder</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
                            <input type="time" {...register("time")} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                            <input type="date" {...register("date")} className={inputClass} />
                            {errors.date && <span className="mt-1 block text-xs text-red-500">{errors.date.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Location <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <input type="text" {...register("location")} className={inputClass} />
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

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Notes <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <textarea {...register("notes")} rows={2} className={`${inputClass} resize-none`} />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] active:scale-[0.98] transition disabled:opacity-60"
                        >
                            {isPending ? "Saving…" : mode === "create" ? "Create Event" : "Save Changes"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        {mode === "edit" && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isPending}
                                title="Delete event"
                                className="ml-auto p-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
