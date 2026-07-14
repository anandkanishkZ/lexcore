import { z } from "zod";
import { AskAiSchema, ChatAboutDocumentSchema } from "../types/ai.type";

export const AskAiDTO = AskAiSchema;
export type AskAiDTO = z.infer<typeof AskAiDTO>;

export const ChatAboutDocumentDTO = ChatAboutDocumentSchema;
export type ChatAboutDocumentDTO = z.infer<typeof ChatAboutDocumentDTO>;
