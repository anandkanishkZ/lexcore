import cron from "node-cron";
import { CalendarEventMongoRepository } from "../repositories/calendar-event.repository";
import { NotificationService } from "../services/notification.service";
import { ICase } from "../models/case.model";
import { IClient } from "../models/client.model";

const calendarEventRepository = new CalendarEventMongoRepository();
const notificationService = new NotificationService();

const REMINDER_WINDOW_HOURS = 24;

function formatHearingWhen(date: Date, time?: string): string {
    const dateLabel = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return time ? `${dateLabel} at ${time}` : dateLabel;
}

/** Finds every upcoming hearing in the next ~24h that hasn't been reminded
 * about yet and pushes one notification per hearing to the owning client's
 * portal account, if they have one. Exported (not just scheduled) so it can
 * be triggered directly in a test or a manual run without waiting for cron. */
export async function sendHearingReminders(): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    const hearings = await calendarEventRepository.findUnremindedHearingsInWindow(now, windowEnd);

    for (const hearing of hearings) {
        const linkedCase = hearing.case as unknown as (ICase & { client?: IClient }) | null;
        const client = linkedCase?.client as unknown as IClient | null;

        // No portal account on the client (or no case linked at all) — no
        // recipient to push to. Still mark it reminded so the sweep doesn't
        // keep re-checking a hearing that can never be notified.
        if (client?.linkedUserId) {
            await notificationService.notifyUser(
                client.linkedUserId.toString(),
                "Upcoming hearing",
                `Your hearing for "${linkedCase?.title ?? "your case"}" is scheduled for ${formatHearingWhen(hearing.date, hearing.time)}.`,
                { type: "CalendarEvent", id: hearing._id.toString() }
            );
        }

        await calendarEventRepository.markReminderSent(hearing._id.toString());
    }
}

/** Optional in-process daily sweep — enabled only when HEARING_REMINDER_CRON
 * is set (a standard cron expression, e.g. "0 8 * * *" for 8am daily).
 * Degrades gracefully (does nothing) when unset, same pattern as
 * startBackupScheduler (scripts/backup-scheduler.ts) and every other
 * optional integration in this codebase. */
export function startHearingReminderScheduler(): void {
    const schedule = process.env.HEARING_REMINDER_CRON;
    if (!schedule) return;

    if (!cron.validate(schedule)) {
        console.error(
            `[hearing-reminder] HEARING_REMINDER_CRON is not a valid cron expression: "${schedule}" — hearing reminders disabled.`
        );
        return;
    }

    cron.schedule(schedule, () => {
        console.log("[hearing-reminder] running scheduled hearing reminder sweep...");
        sendHearingReminders().catch((error) => console.error("[hearing-reminder] scheduled sweep failed:", error));
    });
    console.log(`[hearing-reminder] hearing reminders scheduled: "${schedule}"`);
}
