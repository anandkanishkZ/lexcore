import { z } from "zod";
import { FirmSettingsSchema } from "../types/firm-settings.type";

export const UpdateFirmSettingsDTO = FirmSettingsSchema;
export type UpdateFirmSettingsDTO = z.infer<typeof UpdateFirmSettingsDTO>;
