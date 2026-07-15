import { CaseMongoRepository, CaseQuery } from "../repositories/case.repository";
import { UserMongoRepository } from "../repositories/user.repository";
import { CreateCaseDTO, UpdateCaseDTO } from "../dtos/case.dto";
import { ICase } from "../models/case.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";
import { retryOnDuplicateKey } from "../utils/retry-unique.util";

const caseRepository = new CaseMongoRepository();
const userRepository = new UserMongoRepository();

export class CaseService {
    /**
     * A case's assignedAttorney must be a staff account (any non-client
     * userType), never a client — a client requesting their own case can
     * otherwise end up listed as its own assignable "attorney" wherever the
     * caller's list of candidates isn't already staff-only (e.g. a stale UI,
     * or a direct API call). Shared by create/update so every entry point
     * that can set assignedAttorney enforces this the same way.
     */
    private async assertValidAttorney(attorneyId: string): Promise<void> {
        const user = await userRepository.getUserById(attorneyId);
        if (!user) throw new HttpException(404, "Assigned attorney not found");
        if (user.userType === "client") {
            throw new HttpException(400, "A client cannot be assigned as the attorney on a case");
        }
    }

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

    /**
     * Who may join/use a case's chat thread (Module 15): admins, the case's
     * client (by email, same rule as assertAccess), OR the case's
     * assignedAttorney (by user id, same rule update() already uses for
     * non-admin edit access). Deliberately a separate method rather than
     * broadening assertAccess itself — assertAccess is relied on elsewhere
     * (e.g. DocumentService) with its narrower admin-or-client-only meaning,
     * and chat is the first feature where "the assigned staff member, not
     * just any staff" needs to be let in too.
     */
    async assertChatAccess(id: string, requestingUser: { role: string; email: string; userId: string }): Promise<ICase> {
        const found = await caseRepository.getById(id);
        if (!found) throw new HttpException(404, "Case not found");

        if (requestingUser.role === "admin") return found;

        const client = found.client as unknown as { email?: string } | null;
        if (client && client.email === requestingUser.email) return found;

        const assignedAttorney = found.assignedAttorney as unknown as { _id?: { toString(): string } } | null;
        if (assignedAttorney?._id?.toString() === requestingUser.userId) return found;

        throw new HttpException(403, "Access denied");
    }

    async create(data: CreateCaseDTO, userId: string): Promise<ICase> {
        if (data.assignedAttorney) await this.assertValidAttorney(data.assignedAttorney);

        // count-then-format-then-insert races under concurrent creates (two
        // requests can read the same count before either inserts) and the
        // caseNumber unique index rejects the loser with a raw duplicate-key
        // error — retried here with a fresh count each attempt instead of
        // surfacing a 500 for what's really just a collision.
        return retryOnDuplicateKey(async () => {
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

        if (data.assignedAttorney) await this.assertValidAttorney(data.assignedAttorney);

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
