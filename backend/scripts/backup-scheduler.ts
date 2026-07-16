import cron from "node-cron";
import { runBackup } from "./backup";

/**
 * Optional in-process automated backup — enabled only when
 * BACKUP_SCHEDULE_CRON is set (a standard cron expression, e.g. "0 3 * * *"
 * for 3am daily). Runs inside the same server process, so no OS-level cron
 * / Task Scheduler setup is required on whatever machine hosts this —
 * appropriate for a small firm's single-server deployment. Degrades
 * gracefully (does nothing) when unset, same pattern as every other
 * optional integration in this codebase (SMTP, DEEPSEEK_API_KEY,
 * ENCRYPTION_KEY).
 */
export function startBackupScheduler(): void {
    const schedule = process.env.BACKUP_SCHEDULE_CRON;
    if (!schedule) return;

    if (!cron.validate(schedule)) {
        console.error(
            `[backup] BACKUP_SCHEDULE_CRON is not a valid cron expression: "${schedule}" — automated backups disabled.`
        );
        return;
    }

    cron.schedule(schedule, () => {
        console.log("[backup] running scheduled backup...");
        runBackup().catch((error) => console.error("[backup] scheduled backup failed:", error));
    });
    console.log(`[backup] automated backups scheduled: "${schedule}"`);
}
