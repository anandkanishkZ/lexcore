"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";
import MonthCalendar, { type EventRow } from "./MonthCalendar";
import EventFormModal from "./EventFormModal";
import { typeStyles, typeLabel } from "./constants";

interface CaseOption {
    _id: string;
    title: string;
    caseNumber: string;
}

export default function CalendarPageClient({
    month,
    events,
    cases,
    prevHref,
    nextHref,
}: {
    month: Date;
    events: EventRow[];
    cases: CaseOption[];
    prevHref: string;
    nextHref: string;
}) {
    const router = useRouter();
    const [modalState, setModalState] = useState<{ mode: "create" | "edit"; id?: string; date?: string } | null>(null);

    const refresh = () => {
        setModalState(null);
        router.refresh();
    };

    const upcoming = events
        .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);

    const editingEvent = modalState?.mode === "edit" ? events.find((e) => e._id === modalState.id) : undefined;

    return (
        <div>
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Link href={prevHref} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500">
                        <ChevronLeft className="w-4 h-4" />
                    </Link>
                    <p className="text-base font-semibold text-slate-900 w-36 text-center">{format(month, "MMMM yyyy")}</p>
                    <Link href={nextHref} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500">
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <button
                    onClick={() => setModalState({ mode: "create", date: format(new Date(), "yyyy-MM-dd") })}
                    className="flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-medium text-white hover:bg-[#a3853a] transition"
                >
                    <Plus className="w-4 h-4" />
                    New Event
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
                <MonthCalendar
                    month={month}
                    events={events}
                    onDayClick={(date) => setModalState({ mode: "create", date: format(date, "yyyy-MM-dd") })}
                    onEventClick={(id) => setModalState({ mode: "edit", id })}
                />

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 h-fit">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Upcoming</p>
                    {upcoming.length === 0 ? (
                        <p className="text-sm text-slate-400">Nothing scheduled.</p>
                    ) : (
                        <div className="space-y-3">
                            {upcoming.map((e) => (
                                <button
                                    key={e._id}
                                    onClick={() => setModalState({ mode: "edit", id: e._id })}
                                    className="w-full text-left"
                                >
                                    <p className="text-sm font-medium text-slate-900 truncate">{e.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeStyles[e.type]}`}>
                                            {typeLabel[e.type]}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {format(new Date(e.date), "MMM d")}
                                            {e.time ? ` · ${e.time}` : ""}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {modalState && (
                <EventFormModal
                    mode={modalState.mode}
                    eventId={modalState.id}
                    cases={cases}
                    defaultValues={
                        editingEvent
                            ? {
                                  title: editingEvent.title,
                                  type: editingEvent.type as any,
                                  date: editingEvent.date.slice(0, 10),
                                  time: editingEvent.time,
                              }
                            : { date: modalState.date }
                    }
                    onClose={() => setModalState(null)}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
}
