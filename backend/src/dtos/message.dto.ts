import { z } from "zod";
import { SendMessageSchema } from "../types/message.type";

export const SendMessageDTO = SendMessageSchema;
export type SendMessageDTO = z.infer<typeof SendMessageDTO>;
