import { MessageModel, IMessage } from "../models/message.model";

export class MessageMongoRepository {
    async create(data: Partial<IMessage>): Promise<IMessage> {
        const created = await MessageModel.create(data);
        return MessageModel.findById(created._id).populate("sender", "firstName lastName") as unknown as Promise<IMessage>;
    }

    async getById(id: string): Promise<IMessage | null> {
        return MessageModel.findById(id);
    }

    async getHistory(caseId: string): Promise<IMessage[]> {
        return MessageModel.find({ case: caseId })
            .populate("sender", "firstName lastName")
            .sort({ createdAt: 1 })
            .limit(500);
    }

    /** Every message across a set of cases — used for a client-detail page's
     * cross-case message feed, not a single chat thread like getHistory. */
    async getHistoryForCases(caseIds: string[]): Promise<IMessage[]> {
        return MessageModel.find({ case: { $in: caseIds } })
            .populate("sender", "firstName lastName")
            .populate("case", "title caseNumber")
            .sort({ createdAt: -1 })
            .limit(500);
    }

    /** Marks every message in the case NOT sent by `readerId` as read — see
     * MessageService.getHistory, called whenever the other party fetches the
     * thread. `readAt` was declared on the schema but nothing ever set it. */
    async markReadForCase(caseId: string, readerId: string): Promise<void> {
        await MessageModel.updateMany(
            { case: caseId, sender: { $ne: readerId }, readAt: { $exists: false } },
            { $set: { readAt: new Date() } }
        );
    }
}
