import { MessageModel, IMessage } from "../models/message.model";

export class MessageMongoRepository {
    async create(data: Partial<IMessage>): Promise<IMessage> {
        const created = await MessageModel.create(data);
        return MessageModel.findById(created._id).populate("sender", "firstName lastName") as unknown as Promise<IMessage>;
    }

    async getHistory(caseId: string): Promise<IMessage[]> {
        return MessageModel.find({ case: caseId })
            .populate("sender", "firstName lastName")
            .sort({ createdAt: 1 })
            .limit(500);
    }
}
