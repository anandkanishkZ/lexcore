import { ClientMongoRepository, ClientQuery } from "../repositories/client.repository";
import { CreateClientDTO, UpdateClientDTO } from "../dtos/client.dto";
import { IClient } from "../models/client.model";
import { HttpException } from "../exceptions/http-exception";
import { CaseModel } from "../models/case.model";
import { InvoiceModel } from "../models/invoice.model";
import { UserMongoRepository } from "../repositories/user.repository";

const clientRepository = new ClientMongoRepository();
const userRepository = new UserMongoRepository();

export class ClientService {
    async getAll(query: ClientQuery): Promise<{ data: IClient[]; total: number }> {
        return await clientRepository.getAll(query);
    }

    async getById(id: string): Promise<IClient> {
        const client = await clientRepository.getById(id);
        if (!client) {
            throw new HttpException(404, "Client not found");
        }
        return client;
    }

    async create(data: CreateClientDTO, userId: string): Promise<IClient> {
        const existing = await clientRepository.getByEmail(data.email);
        if (existing) {
            throw new HttpException(400, "Client with this email already exists");
        }
        // A person can already have a portal login (User) before ever
        // getting a CRM record — e.g. they self-registered but no case has
        // been opened for them yet. Auto-link rather than silently creating
        // a second, disconnected record for the same person — the same
        // linking CaseRequestService.approve() already does when a case
        // request resolves to an existing account.
        const existingUser = await userRepository.getUserByEmail(data.email);
        const linkedUserId = existingUser ? (existingUser._id.toString() as any) : undefined;
        return await clientRepository.create({ ...data, createdBy: userId as any, linkedUserId });
    }

    async update(id: string, data: UpdateClientDTO): Promise<IClient> {
        const client = await clientRepository.getById(id);
        if (!client) {
            throw new HttpException(404, "Client not found");
        }

        if (data.email && data.email !== client.email) {
            const existing = await clientRepository.getByEmail(data.email);
            if (existing) {
                throw new HttpException(400, "Email already in use by another client");
            }
        }

        const updated = await clientRepository.update(id, data);
        if (!updated) {
            throw new HttpException(500, "Failed to update client");
        }
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const client = await clientRepository.getById(id);
        if (!client) {
            throw new HttpException(404, "Client not found");
        }

        const [caseCount, invoiceCount] = await Promise.all([
            CaseModel.countDocuments({ client: id }),
            InvoiceModel.countDocuments({ client: id }),
        ]);
        if (caseCount > 0 || invoiceCount > 0) {
            throw new HttpException(
                400,
                `Cannot delete this client — ${caseCount} case(s) and ${invoiceCount} invoice(s) are still linked to them`
            );
        }

        return await clientRepository.delete(id);
    }
}
