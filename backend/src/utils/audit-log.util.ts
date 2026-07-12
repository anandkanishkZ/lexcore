import { AuditLogModel } from "../models/audit-log.model";

/**
 * Fire-and-forget audit entry for a meaningful mutation. Never throws —
 * a logging failure must not fail the request it's describing. Called
 * directly from services at the specific mutation points worth a paper
 * trail (not a generic catch-all middleware, since the interesting detail —
 * "which case was deleted," "which request was approved" — lives in the
 * service, not the raw request).
 */
export async function logAudit(params: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: string;
}): Promise<void> {
    try {
        await AuditLogModel.create({
            actor: params.actorId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            metadata: params.metadata,
        });
    } catch {
        // Swallow — audit logging is best-effort, not a source of user-facing failures.
    }
}
