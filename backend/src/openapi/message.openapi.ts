import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth } from "./registry";
import { MessageResponseSchema, NotificationResponseSchema } from "./schemas";
import { SendMessageDTO } from "../dtos/message.dto";

const security = bearerAuth;

// ---- Messages -------------------------------------------------------------

const messageTags = ["Messages"];

registry.registerPath({
    method: "get",
    path: "/messages",
    tags: messageTags,
    summary: "Get a case's message history",
    description: "REST fallback/initial-load for the Socket.io live-delivery transport — both funnel through the same service. Caller must be the case's client, its assignedAttorney, or an admin.",
    security,
    request: { query: z.object({ case: z.string() }) },
    responses: { 200: envelope(z.array(MessageResponseSchema), "Messages."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/messages",
    tags: messageTags,
    summary: "Send a text message",
    security,
    request: { query: z.object({ case: z.string() }), body: { content: { "application/json": { schema: SendMessageDTO } } } },
    responses: { 201: envelope(MessageResponseSchema, "Message sent."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/messages/attachments",
    tags: messageTags,
    summary: "Send a message with photo/document/voice-note attachments",
    description: 'multipart/form-data — up to 10 files under field "files", plus an optional "content" caption. Every file is scanned for disguised-executable signatures before being accepted.',
    security,
    request: {
        query: z.object({ case: z.string() }),
        body: {
            content: {
                "multipart/form-data": {
                    schema: z.object({
                        files: z.array(z.string().openapi({ type: "string", format: "binary" })),
                        content: z.string().optional(),
                    }),
                },
            },
        },
    },
    responses: { 201: envelope(MessageResponseSchema, "Message sent."), 400: errorEnvelope("No content or files, too many files, or a file failed the safety scan."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/messages/{messageId}/attachments/{attachmentId}/download",
    tags: messageTags,
    summary: "Download one attachment's bytes",
    description: "Same chat-access rule as the thread itself.",
    security,
    request: { params: z.object({ messageId: z.string(), attachmentId: z.string() }) },
    responses: { 200: { description: "The raw file stream.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } }, ...commonErrors },
});

// ---- Notifications ----------------------------------------------------

const notificationTags = ["Notifications"];

registry.registerPath({
    method: "get",
    path: "/notifications",
    tags: notificationTags,
    summary: "Get the signed-in user's own notifications (newest 50) plus an unread count",
    security,
    responses: { 200: envelope(z.object({ notifications: z.array(NotificationResponseSchema), unread: z.number() }), "Notifications."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "patch",
    path: "/notifications/read-all",
    tags: notificationTags,
    summary: "Mark every one of the signed-in user's notifications read",
    security,
    responses: { 200: envelope(z.null(), "Marked read."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "patch",
    path: "/notifications/{id}/read",
    tags: notificationTags,
    summary: "Mark one notification read",
    security,
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: envelope(NotificationResponseSchema, "Notification marked read."), ...commonErrors },
});
