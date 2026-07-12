import { FirmSettingsMongoRepository } from "../repositories/firm-settings.repository";
import { UpdateFirmSettingsDTO } from "../dtos/firm-settings.dto";
import { IFirmSettings } from "../models/firm-settings.model";

const firmSettingsRepository = new FirmSettingsMongoRepository();

export class FirmSettingsService {
    async get(): Promise<IFirmSettings> {
        return firmSettingsRepository.get();
    }

    async update(data: UpdateFirmSettingsDTO): Promise<IFirmSettings> {
        return firmSettingsRepository.update(data);
    }
}
