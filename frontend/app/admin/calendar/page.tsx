import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, addMonths, subMonths, format, parse } from "date-fns";
import { fetchCalendarEventsAction } from "@/lib/actions/calendar-event";
import { fetchCasesAction } from "@/lib/actions/case";
import CalendarPageClient from "./_components/CalendarPageClient";

interface PageProps {
    searchParams: Promise<{ month?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const month = params.month ? parse(params.month, "yyyy-MM", new Date()) : new Date();
    const from = startOfMonth(month);
    const to = endOfMonth(month);

    const [eventsResult, casesResult] = await Promise.all([
        fetchCalendarEventsAction(from.toISOString(), to.toISOString()),
        fetchCasesAction(1, 100),
    ]);

    if (!eventsResult.success && eventsResult.message === "Not authenticated") {
        redirect("/login");
    }

    const events = eventsResult.data ?? [];
    const cases = (casesResult.data ?? []).map((c: any) => ({
        _id: c._id,
        title: c.title,
        caseNumber: c.caseNumber,
    }));

    return (
        <CalendarPageClient
            month={month}
            events={events}
            cases={cases}
            prevHref={`/admin/calendar?month=${format(subMonths(month, 1), "yyyy-MM")}`}
            nextHref={`/admin/calendar?month=${format(addMonths(month, 1), "yyyy-MM")}`}
        />
    );
}
