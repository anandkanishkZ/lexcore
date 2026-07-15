import { CaseMongoRepository, CaseQuery } from "../repositories/case.repository";
import { UserMongoRepository } from "../repositories/user.repository";
import { CreateCaseDTO, UpdateCaseDTO } from "../dtos/case.dto";
import { ICase } from "../models/case.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";
import { retryOnDuplicateKey } from "../utils/retry-unique.util";
import { NotificationService } from "./notification.service";
import { CaseFileModel } from "../models/case-file.model";
import { CaseFolderModel } from "../models/case-folder.model";
import { DocumentRequestModel } from "../models/document-request.model";
import { CalendarEventModel } from "../models/calendar-event.model";
import { InvoiceModel } from "../models/invoice.model";
import { MessageModel } from "../models/message.model";
import { TaskModel } from "../models/task.model";

const caseRepository = new CaseMongoRepository();
const userRepository = new UserMongoRepository();
const notificationService = new NotificationService();

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
    async getById(id: string, requestingUser?: { role: string; email: string; userId?: string }): Promise<ICase> {
        if (requestingUser) return this.assertAccess(id, requestingUser);
        const found = await caseRepository.getById(id);
        if (!found) throw new HttpException(404, "Case not found");
        return found;
    }

    /**
     * Fetches a case and enforces admin-or-client-or-assigned-attorney
     * access, for callers (e.g. DocumentService) that need the check without
     * going through the controller. Shared here rather than duplicated so
     * every case-scoped resource enforces access the same way.
     *
     * `userId` is optional only so the couple of call sites that genuinely
     * can't supply it (none currently — every real caller has a logged-in
     * req.user) don't have to fake one; omitting it just means the
     * assignedAttorney branch below can never match, falling back to the
     * original admin-or-client rule.
     *
     * Was admin-or-client-only until this fix — that locked non-admin staff
     * (attorneys/paralegals, i.e. nearly every account `role: "user"` maps
     * to) out of every document action on every case, including ones they
     * were the assigned attorney on. Mirrors assertChatAccess below, which
     * already had to solve this same problem for Module 15 messaging.
     */
    async assertAccess(id: string, requestingUser: { role: string; email: string; userId?: string }): Promise<ICase> {
        const found = await caseRepository.getById(id);
        if (!found) throw new HttpException(404, "Case not found");

        if (requestingUser.role === "admin") return found;

        const client = found.client as unknown as { email?: string } | null;
        if (client && client.email === requestingUser.email) return found;

        const assignedAttorney = found.assignedAttorney as unknown as { _id?: { toString(): string } } | null;
        if (requestingUser.userId && assignedAttorney?._id?.toString() === requestingUser.userId) return found;

        throw new HttpException(403, "Access denied");
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

        const isClosingNow = data.status === "closed" && existing.status !== "closed";
        const isReopening = data.status !== undefined && data.status !== "closed" && existing.status === "closed";

        if (isClosingNow) {
            const pendingRequests = await DocumentRequestModel.countDocuments({ case: id, status: "pending" });
            if (pendingRequests > 0) {
                throw new HttpException(
                    400,
                    `Cannot close this case — ${pendingRequests} document request(s) are still pending. Cancel or fulfill them first.`
                );
            }
        }

        const updatePayload: any = { ...data };
        if (data.client) updatePayload.client = data.client;
        if (data.assignedAttorney !== undefined) updatePayload.assignedAttorney = data.assignedAttorney || null;
        if (data.openDate) updatePayload.openDate = new Date(data.openDate);
        if (data.closeDate) updatePayload.closeDate = new Date(data.closeDate);
        // Never allow caseNumber to be updated via the API
        delete updatePayload.caseNumber;

        // A close/reopen doesn't always come with an explicit closeDate from
        // the caller (e.g. the Kanban board's drag-and-drop only sends
        // {status}) — without this, a case could show "Closed" with no
        // closeDate, or "Open" next to a stale one from a previous closure.
        if (isClosingNow && !data.closeDate) updatePayload.closeDate = new Date();
        if (isReopening && !data.closeDate) updatePayload.closeDate = null;

        const updated = await caseRepository.update(id, updatePayload);
        if (!updated) throw new HttpException(500, "Failed to update case");

        const actorId = requestingUser?.userId;
        if (data.status && data.status !== existing.status) {
            if (actorId) {
                await logAudit({
                    actorId,
                    action: "case.status-change",
                    entityType: "Case",
                    entityId: id,
                    metadata: `${existing.caseNumber}: ${existing.status} → ${data.status}`,
                });
            }
        }
        if (data.assignedAttorney !== undefined) {
            const previousAttorney = (existing.assignedAttorney as unknown as { _id?: { toString(): string } } | null)?._id?.toString();
            if (data.assignedAttorney !== previousAttorney) {
                if (actorId) {
                    await logAudit({
                        actorId,
                        action: "case.reassign",
                        entityType: "Case",
                        entityId: id,
                        metadata: `${existing.caseNumber}: attorney ${previousAttorney ?? "none"} → ${data.assignedAttorney ?? "none"}`,
                    });
                }
                if (data.assignedAttorney) {
                    await notificationService.notifyUser(
                        data.assignedAttorney,
                        "Case assigned to you",
                        `You've been assigned as attorney on "${updated.title}" (${updated.caseNumber}).`,
                        { type: "Case", id }
                    );
                }
            }
        }

        return updated;
    }

    async delete(id: string, actorId?: string): Promise<boolean> {
        const existing = await caseRepository.getById(id);
        if (!existing) throw new HttpException(404, "Case not found");

        const [fileCount, folderCount, requestCount, eventCount, invoiceCount, messageCount, taskCount] =
            await Promise.all([
                CaseFileModel.countDocuments({ case: id }),
                CaseFolderModel.countDocuments({ case: id }),
                DocumentRequestModel.countDocuments({ case: id }),
                CalendarEventModel.countDocuments({ case: id }),
                InvoiceModel.countDocuments({ case: id }),
                MessageModel.countDocuments({ case: id }),
                TaskModel.countDocuments({ case: id }),
            ]);
        const dependents = fileCount + folderCount + requestCount + eventCount + invoiceCount + messageCount + taskCount;
        if (dependents > 0) {
            throw new HttpException(
                400,
                `Cannot delete this case — it has ${fileCount} document(s), ${folderCount} folder(s), ${requestCount} document request(s), ${eventCount} calendar event(s), ${invoiceCount} invoice(s), ${messageCount} message(s), and ${taskCount} task(s) still linked to it.`
            );
        }

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
