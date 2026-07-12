"use client";

import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    format,
} from "date-fns";
import { typeStyles } from "./constants";

export interface EventRow {
    _id: string;
    title: string;
    type: string;
    date: string;
    time?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthCalendar({
    month,
    events,
    onDayClick,
    onEventClick,
}: {
    month: Date;
    events: EventRow[];
    onDayClick: (date: Date) => void;
    onEventClick: (id: string) => void;
}) {
    const gridStart = startOfWeek(startOfMonth(month));
    const gridEnd = endOfWeek(endOfMonth(month));
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const eventsByDay = new Map<string, EventRow[]>();
    for (const e of events) {
        const key = e.date.slice(0, 10);
        if (!eventsByDay.has(key)) eventsByDay.set(key, []);
        eventsByDay.get(key)!.push(e);
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-100">
                {WEEKDAYS.map((d) => (
                    <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDay.get(key) ?? [];
                    const inMonth = isSameMonth(day, month);

                    return (
                        <button
                            key={key}
                            onClick={() => onDayClick(day)}
                            className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left align-top hover:bg-slate-50 transition ${
                                inMonth ? "" : "bg-slate-50/50"
                            }`}
                        >
                            <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                                    isToday(day)
                                        ? "bg-brand-gold text-white font-semibold"
                                        : inMonth
                                        ? "text-slate-700"
                                        : "text-slate-300"
                                }`}
                            >
                                {format(day, "d")}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, 3).map((e) => (
                                    <div
                                        key={e._id}
                                        role="button"
                                        onClick={(ev) => {
                                            ev.stopPropagation();
                                            onEventClick(e._id);
                                        }}
                                        className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                            typeStyles[e.type] ?? "bg-slate-100 text-slate-600"
                                        }`}
                                        title={e.title}
                                    >
                                        {e.time ? `${e.time} ` : ""}
                                        {e.title}
                                    </div>
                                ))}
                                {dayEvents.length > 3 && (
                                    <p className="text-[11px] text-slate-400 px-1.5">+{dayEvents.length - 3} more</p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
