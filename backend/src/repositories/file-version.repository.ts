import { FileVersionModel, IFileVersion } from "../models/file-version.model";

export class FileVersionMongoRepository {
    async create(data: {
        file: string;
        versionNumber: number;
        name: string;
        mimeType: string;
        size: number;
        storagePath: string;
        uploadedBy: string;
    }): Promise<IFileVersion> {
        return FileVersionModel.create(data);
    }

    async listByFile(fileId: string): Promise<IFileVersion[]> {
        return FileVersionModel.find({ file: fileId })
            .populate("uploadedBy", "firstName lastName")
            .sort({ versionNumber: -1 });
    }

    async getById(id: string): Promise<IFileVersion | null> {
        return FileVersionModel.findById(id);
    }

    async countByFile(fileId: string): Promise<number> {
        return FileVersionModel.countDocuments({ file: fileId });
    }

    async removeAllForFile(fileId: string): Promise<void> {
        await FileVersionModel.deleteMany({ file: fileId });
    }
}
