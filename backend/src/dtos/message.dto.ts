import { z } from "zod";
import { SendMessageSchema, AttachmentCaptionSchema } from "../types/message.type";

export const SendMessageDTO = SendMessageSchema;
export type SendMessageDTO = z.infer<typeof SendMessageDTO>;

export const AttachmentCaptionDTO = AttachmentCaptionSchema;
export type AttachmentCaptionDTO = z.infer<typeof AttachmentCaptionDTO>;
