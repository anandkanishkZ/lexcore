import { DocumentRequestMongoRepository } from "../repositories/document-request.repository";
import { CaseMongoRepository } from "../repositories/case.repository";
import { CaseFileMongoRepository } from "../repositories/case-file.repository";
import { CaseService } from "./case.service";
import { NotificationService } from "./notification.service";
import { CreateDocumentRequestDTO, FulfillDocumentRequestDTO } from "../dtos/document-request.dto";
import { IDocumentRequest } from "../models/document-request.model";
import { HttpException } from "../exceptions/http-exception";
import { logAudit } from "../utils/audit-log.util";
import { sendMail } from "../utils/mail.util";

const documentRequestRepository = new DocumentRequestMongoRepository();
const caseRepository = new CaseMongoRepository();
const fileRepository = new CaseFileMongoRepository();
const caseService = new CaseService();
const notificationService = new NotificationService();

type RequestingUser = { role: string; email: string };

export class DocumentRequestService {
    /**
     * Staff asks a client for a specific document. Notifies the client
     * in-app (if their Client record is linked to a portal User — see
     * Client.linkedUserId) and always emails them, mirroring
     * CaseRequestService's notification pattern.
     */
    async create(data: CreateDocumentRequestDTO, staffUserId: string): Promise<IDocumentRequest> {
        const relatedCase = await caseRepository.getById(data.case);
        if (!relatedCase) throw new HttpException(404, "Case not found");

        const created = await documentRequestRepository.create({
            case: data.case as any,
            title: data.title,
            description: data.description ?? "",
            status: "pending",
            requestedBy: staffUserId as any,
        });

        const client = relatedCase.client as unknown as
            | { email: string; linkedUserId?: { toString(): string } }
            | null;
        if (client) {
            if (client.linkedUserId) {
                await notificationService.notifyUser(
                    client.linkedUserId.toString(),
                    "Document requested",
                    `${relatedCase.caseNumber}: "${data.title}" — please upload this document.`,
                    { type: "DocumentRequest", id: created._id.toString() }
                );
            }
            await sendMail(
                client.email,
                "Document requested",
                `We need the following document for your case (${relatedCase.caseNumber}): "${data.title}".` +
                    (data.description ? ` ${data.description}` : "") +
                    `\n\nPlease upload it via the Lexcore app.`
            );
        }

        return created;
    }

    async getAll(caseId?: string, status?: string): Promise<IDocumentRequest[]> {
        return documentRequestRepository.getAll(caseId, status);
    }

    /** The signed-in client's own document requests, across every case they own. */
    async getMine(requestingUserEmail: string): Promise<IDocumentRequest[]> {
        const cases = await caseService.getMine(requestingUserEmail);
        const caseIds = cases.map((c) => c._id.toString());
        return documentRequestRepository.getMineForCases(caseIds);
    }

    /**
     * The client uploads via the existing POST /documents flow first (which
     * already enforces case ownership before any bytes hit disk), then
     * calls this to link the resulting CaseFile and close out the request.
     * Re-validates ownership here too — this is a distinct write, not just a
     * read, so it must not trust that the earlier upload call was made by
     * the same person inspecting this specific request.
     */
    async fulfill(id: string, data: FulfillDocumentRequestDTO, requestingUser: RequestingUser): Promise<IDocumentRequest> {
        const found = await documentRequestRepository.getById(id);
        if (!found) throw new HttpException(404, "Document request not found");
        if (found.status !== "pending") throw new HttpException(400, "This request has already been handled");

        const caseId = (found.case as unknown as { _id: { toString(): string } })._id.toString();
        await caseService.assertAccess(caseId, requestingUser);

        const file = await fileRepository.getById(data.file);
        if (!file) throw new HttpException(404, "File not found");
        if (file.case.toString() !== caseId) {
            throw new HttpException(400, "That file does not belong to this request's case");
        }

        const updated = await documentRequestRepository.update(id, {
            status: "fulfilled",
            fulfilledFile: data.file as any,
            fulfilledAt: new Date(),
        });
        if (!updated) throw new HttpException(500, "Failed to update document request");

        await notificationService.notifyAdmins(
            "Document uploaded",
            `"${found.title}" was uploaded, fulfilling a document request.`,
            { type: "DocumentRequest", id }
        );

        return updated;
    }

    async cancel(id: string, staffUserId: string): Promise<IDocumentRequest> {
        const found = await documentRequestRepository.getById(id);
        if (!found) throw new HttpException(404, "Document request not found");
        if (found.status !== "pending") throw new HttpException(400, "This request has already been handled");

        const updated = await documentRequestRepository.update(id, { status: "cancelled" });
        if (!updated) throw new HttpException(500, "Failed to update document request");

        await logAudit({
            actorId: staffUserId,
            action: "document-request.cancel",
            entityType: "DocumentRequest",
            entityId: id,
            metadata: found.title,
        });

        return updated;
    }
}
