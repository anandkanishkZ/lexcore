import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { AskAiDTO, ChatAboutDocumentDTO } from "../dtos/ai.dto";

const security = bearerAuth;
const notConfigured = () => errorEnvelope("AI features are not configured on this server (no DEEPSEEK_API_KEY).");

const AiSource = z.union([
    z.object({ type: z.literal("case"), id: z.string(), title: z.string(), caseNumber: z.string(), excerpt: z.string() }),
    z.object({ type: z.literal("document"), id: z.string(), name: z.string(), caseId: z.string(), caseTitle: z.string(), excerpt: z.string() }),
]);
const AskResponse = z.object({ answer: z.string(), sources: z.array(AiSource) });
const SummaryResponse = z.object({ summary: z.string() });
const ChatResponse = z.object({ answer: z.string() });

// ---- Staff-only, unscoped -------------------------------------------------

const staffTags = ["AI (staff, unscoped)"];

registry.registerPath({
    method: "post",
    path: "/ai/ask",
    tags: staffTags,
    summary: "Keyword search across every case/document, with a DeepSeek-generated grounded answer",
    description: "Staff-only, any staff member — not scoped to assignment. Rate-limited (billed DeepSeek calls).",
    security,
    request: { body: { content: { "application/json": { schema: AskAiDTO } } } },
    responses: { 200: envelope(AskResponse, "Answer + cited sources."), 400: errorEnvelope("Validation failed."), 503: notConfigured(), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/ai/cases/{id}/summary",
    tags: staffTags,
    summary: "AI summary of one case",
    security,
    request: { params: idParam },
    responses: { 200: envelope(SummaryResponse, "Summary."), 503: notConfigured(), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/ai/documents/{id}/summary",
    tags: staffTags,
    summary: "AI summary of one document",
    security,
    request: { params: idParam },
    responses: { 200: envelope(SummaryResponse, "Summary."), 400: errorEnvelope("No extractable text is available for this document."), 503: notConfigured(), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/ai/documents/{id}/chat",
    tags: staffTags,
    summary: "Multi-turn Q&A grounded in one document",
    description: "Stateless — the client resends the full (capped) turn history on every message.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: ChatAboutDocumentDTO } } } },
    responses: { 200: envelope(ChatResponse, "Answer."), 400: errorEnvelope("No extractable text is available for this document."), 503: notConfigured(), ...commonErrors },
});

// ---- Client-scoped ("my" data only) -----------------------------------

const myTags = ["AI (client-scoped)"];

registry.registerPath({
    method: "post",
    path: "/ai/my/ask",
    tags: myTags,
    summary: "Keyword search across only the signed-in user's own cases/documents",
    description: "Any authenticated user — the mobile app's Ask AI feature. Ownership-checked server-side.",
    security,
    request: { body: { content: { "application/json": { schema: AskAiDTO } } } },
    responses: { 200: envelope(AskResponse, "Answer + cited sources."), 400: errorEnvelope("Validation failed."), 503: notConfigured(), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/ai/my/cases/{id}/summary",
    tags: myTags,
    summary: "AI summary of one of the caller's own cases",
    security,
    request: { params: idParam },
    responses: { 200: envelope(SummaryResponse, "Summary."), 503: notConfigured(), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/ai/my/documents/{id}/summary",
    tags: myTags,
    summary: "AI summary of a document on one of the caller's own cases",
    security,
    request: { params: idParam },
    responses: { 200: envelope(SummaryResponse, "Summary."), 400: errorEnvelope("No extractable text is available for this document."), 503: notConfigured(), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/ai/my/documents/{id}/chat",
    tags: myTags,
    summary: "Multi-turn Q&A about a document the caller owns",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: ChatAboutDocumentDTO } } } },
    responses: { 200: envelope(ChatResponse, "Answer."), 400: errorEnvelope("No extractable text is available for this document."), 503: notConfigured(), ...commonErrors },
});
