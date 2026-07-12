import { FirmSettingsModel, IFirmSettings } from "../models/firm-settings.model";

export class FirmSettingsMongoRepository {
    /** Always the same single document — created on first read/write. */
    async get(): Promise<IFirmSettings> {
        const existing = await FirmSettingsModel.findOne();
        if (existing) return existing;
        return FirmSettingsModel.create({});
    }

    async update(data: Partial<IFirmSettings>): Promise<IFirmSettings> {
        const updated = await FirmSettingsModel.findOneAndUpdate({}, data, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        });
        return updated!;
    }
}
