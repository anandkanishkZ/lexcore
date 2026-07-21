import { CaseRequestMongoRepository } from "../repositories/case-request.repository";
import { UserMongoRepository } from "../repositories/user.repository";
import { ClientModel } from "../models/client.model";
import { CreateCaseRequestDTO, ApproveCaseRequestDTO, RejectCaseRequestDTO } from "../dtos/case-request.dto";
import { ICaseRequest } from "../models/case-request.model";
import { HttpException } from "../exceptions/http-exception";
import { CaseService } from "./case.service";
import { NotificationService } from "./notification.service";
import { logAudit } from "../utils/audit-log.util";
import { sendMail } from "../utils/mail.util";

const caseRequestRepository = new CaseRequestMongoRepository();
const userRepository = new UserMongoRepository();
const caseService = new CaseService();
const notificationService = new NotificationService();

export class CaseRequestService {
    async create(data: CreateCaseRequestDTO, requestedByUserId: string): Promise<ICaseRequest> {
        const isDuplicate = await caseRequestRepository.hasPendingWithTitle(requestedByUserId, data.title);
        if (isDuplicate) {
            throw new HttpException(400, "You already have a pending request with this title — wait for it to be reviewed before submitting another.");
        }

        const created = await caseRequestRepository.create({
            requestedBy: requestedByUserId as any,
            title: data.title,
            type: data.type,
            description: data.description,
            phone: data.phone,
            status: "pending",
        });

        await notificationService.notifyAdmins(
            "New case request",
            `A new case request "${data.title}" was submitted and is awaiting review.`,
            { type: "CaseRequest", id: created._id.toString() }
        );
        await notificationService.emailAdmins(
            "New case request submitted",
            `A new case request "${data.title}" was submitted and is awaiting review in the admin console.`
        );

        return created;
    }

    async getMine(userId: string): Promise<ICaseRequest[]> {
        return caseRequestRepository.getMineByUserId(userId);
    }

    async getAll(status?: string): Promise<ICaseRequest[]> {
        return caseRequestRepository.getAll(status);
    }

    async getById(id: string): Promise<ICaseRequest> {
        const found = await caseRequestRepository.getById(id);
        if (!found) throw new HttpException(404, "Case request not found");
        return found;
    }

    /**
     * Creates the real Case from a pending request. The requester only has a
     * `User` (login) account, not a `Client` (business/CRM) record — cases
     * link to `Client`, so we resolve one by email, creating it from the
     * requester's name/email plus the phone they supplied at request time if
     * none exists yet. Reuses `CaseService.create` rather than duplicating
     * its case-number-generation logic.
     */
    async approve(id: string, staffUserId: string, data: ApproveCaseRequestDTO): Promise<ICaseRequest> {
        // Validated BEFORE anything is claimed/created — this used to run
        // only inside caseService.create(), after the request was already
        // claimed "approved" and the Client record already created/linked.
        // An invalid attorney then left a permanently stuck record: marked
        // approved, no resultingCase, nothing to retry from in the UI. Now a
        // bad selection fails clean with the request still pending.
        if (data.assignedAttorney) await caseService.assertValidAttorney(data.assignedAttorney);

        // Atomically claim the request out of "pending" FIRST — a plain
        // read-then-write here let two concurrent approvals (a double-click,
        // or two staff triaging at once) both pass the pending check before
        // either wrote, each creating its own real Case from the same
        // request. Only one findOneAndUpdate({status:"pending"}) can ever
        // succeed; the loser gets null back before doing anything else.
        const request = await caseRequestRepository.updateIfPending(id, {
            status: "approved",
            reviewedBy: staffUserId as any,
            reviewNote: data.reviewNote,
        });
        if (!request) {
            const existing = await caseRequestRepository.getById(id);
            if (!existing) throw new HttpException(404, "Case request not found");
            throw new HttpException(400, "This request has already been reviewed");
        }

        // getById/updateIfPending populate requestedBy, so it's a
        // subdocument here, not a raw ObjectId — extract its _id rather
        // than .toString()-ing the document.
        const requestedById = (request.requestedBy as unknown as { _id: { toString(): string } })._id.toString();

        // MongoDB here runs standalone (no replica set), so there's no
        // multi-document transaction to wrap the claim + client-creation +
        // case-creation in. The attorney check above covers the one routine,
        // easily-triggered failure; this catch is the backstop for anything
        // else (a deleted requester, a DB hiccup) — it un-claims the request
        // back to "pending" so a failure here is retryable instead of
        // leaving a permanently stuck "approved" record with no case.
        let createdCase;
        let client;
        let requester;
        try {
            requester = await userRepository.getUserById(requestedById);
            if (!requester) throw new HttpException(404, "Requesting user not found");

            client = await ClientModel.findOne({ email: requester.email });
            if (!client) {
                client = await ClientModel.create({
                    firstName: requester.firstName,
                    lastName: requester.lastName,
                    email: requester.email,
                    phone: request.phone,
                    type: "individual",
                    status: "active",
                    createdBy: staffUserId,
                    linkedUserId: requester._id,
                });
            } else if (!client.linkedUserId) {
                // Pre-existing Client record from before linkedUserId existed, or
                // one an admin created by hand before this requester ever logged
                // in — link it now rather than leaving requester and contact as
                // two permanently-unrelated rows in the members directory.
                client.linkedUserId = requester._id as any;
                await client.save();
            }

            createdCase = await caseService.create(
                {
                    title: request.title,
                    type: request.type,
                    status: "open",
                    client: client._id.toString(),
                    assignedAttorney: data.assignedAttorney,
                    description: request.description,
                },
                staffUserId
            );
        } catch (error) {
            await caseRequestRepository.update(id, { status: "pending", reviewedBy: undefined, reviewNote: undefined });
            throw error;
        }

        // The request is already claimed (status/reviewedBy/reviewNote set
        // atomically above) — this second write only attaches the case that
        // resulted from it, so a plain update (not updateIfPending) is fine.
        const updated = await caseRequestRepository.update(id, { resultingCase: createdCase._id });
        if (!updated) throw new HttpException(500, "Failed to update case request");

        await logAudit({
            actorId: staffUserId,
            action: "case-request.approve",
            entityType: "CaseRequest",
            entityId: id,
            metadata: `${request.title} → ${createdCase.caseNumber}`,
        });

        const approvalMessage = `Good news — your request "${request.title}" was approved. Your case number is ${createdCase.caseNumber}.`;
        await notificationService.notifyUser(requester._id.toString(), "Case request approved", approvalMessage, {
            type: "Case",
            id: createdCase._id.toString(),
        });
        await sendMail(
            requester.email,
            "Your case request was approved",
            `${approvalMessage} You can view it in the Lexcore app under My Cases.`
        );

        if (data.assignedAttorney) {
            await notificationService.notifyUser(
                data.assignedAttorney,
                "New case assigned to you",
                `You've been assigned as attorney on "${createdCase.title}" (${createdCase.caseNumber}).`,
                { type: "Case", id: createdCase._id.toString() }
            );
        }

        return updated;
    }

    async reject(id: string, staffUserId: string, data: RejectCaseRequestDTO): Promise<ICaseRequest> {
        // Same atomic-claim-first reasoning as approve() above.
        const updated = await caseRequestRepository.updateIfPending(id, {
            status: "rejected",
            reviewedBy: staffUserId as any,
            reviewNote: data.reviewNote,
        });
        if (!updated) {
            const existing = await caseRequestRepository.getById(id);
            if (!existing) throw new HttpException(404, "Case request not found");
            throw new HttpException(400, "This request has already been reviewed");
        }

        const requestedById = (updated.requestedBy as unknown as { _id: { toString(): string } })._id.toString();
        const requester = await userRepository.getUserById(requestedById);

        await logAudit({
            actorId: staffUserId,
            action: "case-request.reject",
            entityType: "CaseRequest",
            entityId: id,
            metadata: data.reviewNote,
        });
        if (requester) {
            const rejectionMessage = `Your request "${updated.title}" was not approved. Reason: ${data.reviewNote}`;
            await notificationService.notifyUser(requester._id.toString(), "Case request update", rejectionMessage, {
                type: "CaseRequest",
                id: id,
            });
            await sendMail(requester.email, "Update on your case request", rejectionMessage);
        }
        return updated;
    }
}
