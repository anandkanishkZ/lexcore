import { FileShareModel, IFileShare } from "../models/file-share.model";

export class FileShareMongoRepository {
    /** Re-sharing the same file+email updates the role rather than duplicating. */
    async upsert(fileId: string, email: string, role: "viewer" | "editor", sharedBy: string): Promise<IFileShare> {
        return FileShareModel.findOneAndUpdate(
            { file: fileId, email: email.toLowerCase().trim() },
            { role, sharedBy },
            { new: true, upsert: true }
        );
    }

    async listByFile(fileId: string): Promise<IFileShare[]> {
        return FileShareModel.find({ file: fileId }).populate("sharedBy", "firstName lastName").sort({ createdAt: -1 });
    }

    async findByFileAndEmail(fileId: string, email: string): Promise<IFileShare | null> {
        return FileShareModel.findOne({ file: fileId, email: email.toLowerCase().trim() });
    }

    async getById(id: string): Promise<IFileShare | null> {
        return FileShareModel.findById(id);
    }

    async remove(id: string): Promise<boolean> {
        const deleted = await FileShareModel.findByIdAndDelete(id);
        return !!deleted;
    }

    async removeAllForFile(fileId: string): Promise<void> {
        await FileShareModel.deleteMany({ file: fileId });
    }
}
