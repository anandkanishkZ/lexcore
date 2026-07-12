import { CaseMongoRepository, CaseQuery } from "../repositories/case.repository";
import { CreateCaseDTO, UpdateCaseDTO } from "../dtos/case.dto";
import { ICase } from "../models/case.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";

const caseRepository = new CaseMongoRepository();

export class CaseService {
    async getAll(query: CaseQuery): Promise<{ data: ICase[]; total: number }> {
        return caseRepository.getAll(query);
    }

    /**
     * `requestingUser` is omitted by admin-only call sites that already
     * enforced access via adminMiddleware. When present (the shared
     * GET /cases/:id route, reachable by clients), a non-admin caller may
     * only fetch a case belonging to their own email — mirrors getMine's
     * email-based scoping.
     */
    async getById(id: string, requestingUser?: { role: string; email: string }): Promise<ICase> {
        if (requestingUser) return this.assertAccess(id, requestingUser);
        const found = await caseRepository.getById(id);
        if (!found) throw new HttpException(404, "Case not found");
        return found;
    }

    /**
     * Fetches a case and enforces the same admin-or-owner rule as getById,
     * for callers (e.g. DocumentService) that need the check without going
     * through the controller. Shared here rather than duplicated so every
     * case-scoped resource enforces access the same way.
     */
    async assertAccess(id: string, requestingUser: { role: string; email: string }): Promise<ICase> {
        const found = await caseRepository.getById(id);
        if (!found) throw new HttpException(404, "Case not found");

        if (requestingUser.role !== "admin") {
            const client = found.client as unknown as { email?: string } | null;
            if (!client || client.email !== requestingUser.email) {
                throw new HttpException(403, "Access denied");
            }
        }

        return found;
    }

    async create(data: CreateCaseDTO, userId: string): Promise<ICase> {
        const total = await caseRepository.countAll();
        const year = new Date().getFullYear();
        const caseNumber = `CASE-${year}-${String(total + 1).padStart(4, "0")}`;

        return caseRepository.create({
            title: data.title,
            caseNumber,
            type: data.type,
            status: data.status ?? "open",
            description: data.description ?? "",
            client: data.client as any,
            assignedAttorney: data.assignedAttorney ? (data.assignedAttorney as any) : undefined,
            openDate: data.openDate ? new Date(data.openDate) : new Date(),
            closeDate: data.closeDate ? new Date(data.closeDate) : undefined,
            createdBy: userId as any,
        });
    }

    /**
     * `requestingUser` is omitted by call sites that don't need the check
     * (none currently — every route reaching this goes through
     * staffMiddleware, which already excludes clients). A non-admin staff
     * member may only update a case they're the assignedAttorney on; admins
     * can update any case.
     */
    async update(id: string, data: UpdateCaseDTO, requestingUser?: { role: string; userId: string }): Promise<ICase> {
        const existing = await caseRepository.getById(id);
        if (!existing) throw new HttpException(404, "Case not found");

        if (requestingUser && requestingUser.role !== "admin") {
            const assignedAttorney = existing.assignedAttorney as unknown as { _id?: { toString(): string } } | null;
            const assignedId = assignedAttorney?._id?.toString();
            if (assignedId !== requestingUser.userId) {
                throw new HttpException(403, "You can only edit cases assigned to you");
            }
        }

        const updatePayload: any = { ...data };
        if (data.client) updatePayload.client = data.client;
        if (data.assignedAttorney !== undefined) updatePayload.assignedAttorney = data.assignedAttorney || null;
        if (data.openDate) updatePayload.openDate = new Date(data.openDate);
        if (data.closeDate) updatePayload.closeDate = new Date(data.closeDate);
        // Never allow caseNumber to be updated via the API
        delete updatePayload.caseNumber;

        const updated = await caseRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update case");
        return updated;
    }

    async delete(id: string, actorId?: string): Promise<boolean> {
        const existing = await caseRepository.getById(id);
        if (!existing) throw new HttpException(404, "Case not found");
        const deleted = await caseRepository.delete(id);
        if (deleted && actorId) {
            await logAudit({
                actorId,
                action: "case.delete",
                entityType: "Case",
                entityId: id,
                metadata: `${existing.caseNumber} — ${existing.title}`,
            });
        }
        return deleted;
    }

    async getMine(email: string): Promise<ICase[]> {
        return caseRepository.getMineByEmail(email);
    }
}
