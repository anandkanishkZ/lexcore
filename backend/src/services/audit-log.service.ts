import { AuditLogMongoRepository } from "../repositories/audit-log.repository";
import { IAuditLog } from "../models/audit-log.model";

const auditLogRepository = new AuditLogMongoRepository();

export class AuditLogService {
    async getAll(page: number, size: number): Promise<{ data: IAuditLog[]; total: number }> {
        return auditLogRepository.getAll(page, size);
    }
}
