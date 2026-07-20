import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth } from "./registry";
import { FirmSettingsResponseSchema, ClientResponseSchema, UserResponseSchema, AuditLogResponseSchema } from "./schemas";
import { UpdateFirmSettingsDTO } from "../dtos/firm-settings.dto";

const security = bearerAuth;

// ---- Reports (staff-only canned dashboard aggregates) ----------------

const reportTags = ["Reports"];

registry.registerPath({
    method: "get",
    path: "/reports/cases-by-status",
    tags: reportTags,
    summary: "Case counts by status",
    security,
    responses: {
        200: envelope(z.array(z.object({ status: z.string(), count: z.number() })), "Counts."),
        401: commonErrors[401],
        403: commonErrors[403],
    },
});

registry.registerPath({
    method: "get",
    path: "/reports/revenue-by-month",
    tags: reportTags,
    summary: "Collected revenue, trailing N months",
    security,
    request: { query: z.object({ months: z.coerce.number().int().min(1).max(24).optional().openapi({ description: "Default 6." }) }) },
    responses: {
        200: envelope(z.array(z.object({ month: z.string(), revenue: z.number() })), "Revenue by month."),
        400: errorEnvelope("months must be a number between 1 and 24."),
        401: commonErrors[401],
        403: commonErrors[403],
    },
});

registry.registerPath({
    method: "get",
    path: "/reports/task-completion",
    tags: reportTags,
    summary: "Task counts by status, plus a completion rate",
    security,
    responses: {
        200: envelope(z.object({ todo: z.number(), inProgress: z.number(), done: z.number(), completionRate: z.number() }), "Task completion."),
        401: commonErrors[401],
        403: commonErrors[403],
    },
});

// ---- Settings -----------------------------------------------------------

const settingsTags = ["Settings"];

registry.registerPath({
    method: "get",
    path: "/settings/firm",
    tags: settingsTags,
    summary: "Get firm settings",
    description: "Any staff member.",
    security,
    responses: { 200: envelope(FirmSettingsResponseSchema, "Firm settings."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/settings/firm",
    tags: settingsTags,
    summary: "Update firm settings",
    description: "Admin-only. Omit esewaSecret to leave the previously saved secret untouched.",
    security,
    request: { body: { content: { "application/json": { schema: UpdateFirmSettingsDTO } } } },
    responses: { 200: envelope(FirmSettingsResponseSchema, "Firm settings updated."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/settings/payment/esewa-config",
    tags: settingsTags,
    summary: "Whether online payment is enabled, and which environment",
    description: "Any authenticated user, including clients — just enough to decide whether to show a \"Pay with eSewa\" button. Never returns the merchant code or secret.",
    security,
    responses: { 200: envelope(z.object({ enabled: z.boolean(), environment: z.enum(["test", "live"]) }), "Payment config."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/settings/public",
    tags: settingsTags,
    summary: "Firm name + currency",
    description: "Any authenticated user — non-sensitive fields the mobile app needs to format amounts correctly.",
    security,
    responses: { 200: envelope(z.object({ name: z.string(), currency: z.string() }), "Public firm info."), 401: commonErrors[401] },
});

// ---- Members (merged staff+client directory) ---------------------------

registry.registerPath({
    method: "get",
    path: "/members",
    tags: ["Members"],
    summary: "Merged staff + client directory",
    description: "Staff-only — returns every staff member's and every client's name/email/phone.",
    security,
    request: { query: z.object({ search: z.string().optional() }) },
    responses: { 200: envelope(z.array(z.union([UserResponseSchema, ClientResponseSchema])), "Members."), 401: commonErrors[401], 403: commonErrors[403] },
});

// ---- Audit Log ------------------------------------------------------------

registry.registerPath({
    method: "get",
    path: "/audit-logs",
    tags: ["Audit Log"],
    summary: "List mutation audit-trail entries",
    description: "Admin-only.",
    security,
    request: {
        query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            size: z.coerce.number().int().min(1).optional(),
            entityType: z.string().optional(),
        }),
    },
    responses: { 200: envelope(z.array(AuditLogResponseSchema), "Audit entries."), 401: commonErrors[401], 403: commonErrors[403] },
});
