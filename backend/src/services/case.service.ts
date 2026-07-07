import { CaseMongoRepository, CaseQuery } from "../repositories/case.repository";
import { CreateCaseDTO, UpdateCaseDTO } from "../dtos/case.dto";
import { ICase } from "../models/case.model";
import { HttpException } from "../exceptions/http-exception";

const caseRepository = new CaseMongoRepository();

export class CaseService {
    async getAll(query: CaseQuery): Promise<{ data: ICase[]; total: number }> {
        return caseRepository.getAll(query);
    }

    async getById(id: string): Promise<ICase> {
        const found = await caseRepository.getById(id);
        if (!found) throw new HttpException(404, "Case not found");
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

    async update(id: string, data: UpdateCaseDTO): Promise<ICase> {
        const existing = await caseRepository.getById(id);
        if (!existing) throw new HttpException(404, "Case not found");

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

    async delete(id: string): Promise<boolean> {
        const existing = await caseRepository.getById(id);
        if (!existing) throw new HttpException(404, "Case not found");
        return caseRepository.delete(id);
    }
}
