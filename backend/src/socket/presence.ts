/**
 * In-memory tracker of which users are currently connected to which case's
 * chat room, so MessageService can decide whether a live socket delivery is
 * enough or an offline-notification fallback is needed. Deliberately
 * in-process (not Redis/shared) — this project runs a single backend
 * instance, so there's no multi-process state to reconcile.
 *
 * Tracked as a per-(case, user) connection COUNT, not a boolean — a user can
 * have more than one live connection to the same case (two browser tabs, or
 * web + mobile at once). A boolean Set previously meant closing any ONE of
 * several connections marked the user fully offline (triggering a spurious
 * "they're offline" notification+email) even while they were still
 * connected elsewhere. The count only reaches zero once every connection
 * has disconnected.
 */
const roomPresence = new Map<string, Map<string, number>>();

export function markOnline(caseId: string, userId: string): void {
    const room = roomPresence.get(caseId) ?? new Map<string, number>();
    room.set(userId, (room.get(userId) ?? 0) + 1);
    roomPresence.set(caseId, room);
}

export function markOffline(caseId: string, userId: string): void {
    const room = roomPresence.get(caseId);
    if (!room) return;

    const remaining = (room.get(userId) ?? 0) - 1;
    if (remaining > 0) {
        room.set(userId, remaining);
    } else {
        room.delete(userId);
        if (room.size === 0) roomPresence.delete(caseId);
    }
}

export function isOnline(caseId: string, userId: string): boolean {
    return (roomPresence.get(caseId)?.get(userId) ?? 0) > 0;
}
