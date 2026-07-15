import { z } from "zod";

export const SendMessageSchema = z.object({
    // .trim() before the length checks so whitespace-only content ("   ")
    // is rejected the same way an empty string already is, not just on the
    // two UIs that happen to guard it client-side — this is the only
    // validation a direct API call gets.
    content: z.string().trim().min(1, "Message cannot be empty").max(4000, "Message is too long"),
});

export type SendMessageType = z.infer<typeof SendMessageSchema>;

// Attachment uploads arrive as multipart/form-data — files are handled by
// multer (see message-attachment-upload.middleware.ts), this only validates
// the accompanying text field. Unlike SendMessageSchema, content here is
// optional (a photo with no caption is a valid message) — MessageService
// still rejects a request with neither content nor any files.
export const AttachmentCaptionSchema = z.object({
    content: z.string().trim().max(4000, "Message is too long").optional(),
});

export type AttachmentCaptionType = z.infer<typeof AttachmentCaptionSchema>;
