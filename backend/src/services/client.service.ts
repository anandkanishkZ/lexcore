import { ClientMongoRepository, ClientQuery } from "../repositories/client.repository";
import { CreateClientDTO, UpdateClientDTO } from "../dtos/client.dto";
import { IClient } from "../models/client.model";
import { HttpException } from "../exceptions/http-exception";

const clientRepository = new ClientMongoRepository();

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
        return await clientRepository.create({ ...data, createdBy: userId as any });
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
        return await clientRepository.delete(id);
    }
}
