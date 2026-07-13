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
        const request = await caseRequestRepository.getById(id);
        if (!request) throw new HttpException(404, "Case request not found");
        if (request.status !== "pending") throw new HttpException(400, "This request has already been reviewed");

        // getById populates requestedBy, so it's a subdocument here, not a raw
        // ObjectId — extract its _id rather than .toString()-ing the document.
        const requestedById = (request.requestedBy as unknown as { _id: { toString(): string } })._id.toString();
        const requester = await userRepository.getUserById(requestedById);
        if (!requester) throw new HttpException(404, "Requesting user not found");

        let client = await ClientModel.findOne({ email: requester.email });
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

        const createdCase = await caseService.create(
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

        const updated = await caseRequestRepository.update(id, {
            status: "approved",
            reviewedBy: staffUserId as any,
            reviewNote: data.reviewNote,
            resultingCase: createdCase._id,
        });
        if (!updated) throw new HttpException(500, "Failed to update case request");

        await logAudit({
            actorId: staffUserId,
            action: "case-request.approve",
            entityType: "CaseRequest",
            entityId: id,
            metadata: `${request.title} → ${createdCase.caseNumber}`,
        });
        await sendMail(
            requester.email,
            "Your case request was approved",
            `Good news — your request "${request.title}" was approved. Your case number is ${createdCase.caseNumber}. ` +
                `You can view it in the Lexcore app under My Cases.`
        );
        return updated;
    }

    async reject(id: string, staffUserId: string, data: RejectCaseRequestDTO): Promise<ICaseRequest> {
        const request = await caseRequestRepository.getById(id);
        if (!request) throw new HttpException(404, "Case request not found");
        if (request.status !== "pending") throw new HttpException(400, "This request has already been reviewed");

        const requestedById = (request.requestedBy as unknown as { _id: { toString(): string } })._id.toString();
        const requester = await userRepository.getUserById(requestedById);

        const updated = await caseRequestRepository.update(id, {
            status: "rejected",
            reviewedBy: staffUserId as any,
            reviewNote: data.reviewNote,
        });
        if (!updated) throw new HttpException(500, "Failed to update case request");

        await logAudit({
            actorId: staffUserId,
            action: "case-request.reject",
            entityType: "CaseRequest",
            entityId: id,
            metadata: data.reviewNote,
        });
        if (requester) {
            await sendMail(
                requester.email,
                "Update on your case request",
                `Your request "${request.title}" was not approved. Reason: ${data.reviewNote}`
            );
        }
        return updated;
    }
}
