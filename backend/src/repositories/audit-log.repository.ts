import { AuditLogModel, IAuditLog } from "../models/audit-log.model";

export class AuditLogMongoRepository {
    async getAll(page: number, size: number): Promise<{ data: IAuditLog[]; total: number }> {
        const skip = (page - 1) * size;
        const [data, total] = await Promise.all([
            AuditLogModel.find()
                .populate("actor", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(size),
            AuditLogModel.countDocuments(),
        ]);
        return { data, total };
    }
}
