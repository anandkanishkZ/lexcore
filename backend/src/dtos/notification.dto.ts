import { z } from "zod";
import { RegisterDeviceTokenSchema } from "../types/notification.type";

export const RegisterDeviceTokenDTO = RegisterDeviceTokenSchema;
export type RegisterDeviceTokenDTO = z.infer<typeof RegisterDeviceTokenDTO>;
