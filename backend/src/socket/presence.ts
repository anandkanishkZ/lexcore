/**
 * In-memory tracker of which users are currently connected to which case's
 * chat room, so MessageService can decide whether a live socket delivery is
 * enough or an offline-notification fallback is needed. Deliberately
 * in-process (not Redis/shared) — this project runs a single backend
 * instance, so there's no multi-process state to reconcile.
 */
const roomPresence = new Map<string, Set<string>>();

export function markOnline(caseId: string, userId: string): void {
    if (!roomPresence.has(caseId)) roomPresence.set(caseId, new Set());
    roomPresence.get(caseId)!.add(userId);
}

export function markOffline(caseId: string, userId: string): void {
    roomPresence.get(caseId)?.delete(userId);
}

export function isOnline(caseId: string, userId: string): boolean {
    return roomPresence.get(caseId)?.has(userId) ?? false;
}
