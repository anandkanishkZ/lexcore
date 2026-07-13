import { z } from "zod";

export const SendMessageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty").max(4000, "Message is too long"),
});

export type SendMessageType = z.infer<typeof SendMessageSchema>;
