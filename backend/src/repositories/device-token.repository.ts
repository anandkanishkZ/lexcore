import { DeviceTokenModel } from "../models/device-token.model";

export class DeviceTokenMongoRepository {
    /** Upsert by token, not by (user, platform) — the same physical device
     * can get a fresh FCM token at any time (app reinstall, cache clear),
     * and the same token value is never issued to two devices, so `token`
     * is the natural identity. Re-registering under a different user (a
     * shared/reused device signing in as someone else) correctly reassigns
     * it rather than creating a duplicate. */
    async register(userId: string, token: string, platform: "android" | "ios"): Promise<void> {
        await DeviceTokenModel.findOneAndUpdate(
            { token },
            { user: userId, token, platform },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }

    async unregister(token: string): Promise<void> {
        await DeviceTokenModel.deleteOne({ token });
    }

    async getTokensForUsers(userIds: string[]): Promise<string[]> {
        const rows = await DeviceTokenModel.find({ user: { $in: userIds } }, "token");
        return rows.map((r) => r.token);
    }

    /** Called with whatever FCM reports back as no-longer-registered after
     * a send — see utils/push.util.ts. */
    async deleteTokens(tokens: string[]): Promise<void> {
        if (tokens.length === 0) return;
        await DeviceTokenModel.deleteMany({ token: { $in: tokens } });
    }
}
