import { z } from "zod";

export const AskAiSchema = z.object({
    query: z.string().min(1, "A question is required").max(500, "Keep questions under 500 characters"),
});

export type AskAiType = z.infer<typeof AskAiSchema>;

// Capped at 20 turns / 2000 chars per turn so a runaway client-side history
// can't blow up the prompt sent to DeepSeek on every message.
export const ChatAboutDocumentSchema = z.object({
    query: z.string().min(1, "A question is required").max(500, "Keep questions under 500 characters"),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().min(1).max(2000),
            })
        )
        .max(20, "Conversation is too long — start a new chat")
        .default([]),
});

export type ChatAboutDocumentType = z.infer<typeof ChatAboutDocumentSchema>;
