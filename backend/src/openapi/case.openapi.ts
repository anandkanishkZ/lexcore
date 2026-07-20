import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { CaseResponseSchema, CaseRequestResponseSchema } from "./schemas";
import { CreateCaseDTO, UpdateCaseDTO } from "../dtos/case.dto";
import { CreateCaseRequestDTO, ApproveCaseRequestDTO, RejectCaseRequestDTO } from "../dtos/case-request.dto";

const security = bearerAuth;

// ---- Cases ------------------------------------------------------------

const caseTags = ["Cases"];

registry.registerPath({
    method: "get",
    path: "/cases/mine",
    tags: caseTags,
    summary: "Get the signed-in client's own cases",
    security,
    responses: { 200: envelope(z.array(CaseResponseSchema), "The caller's cases."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/cases/{id}",
    tags: caseTags,
    summary: "Get one case by id",
    description: "Any authenticated user — a non-admin caller may only fetch a case belonging to them (client by email) or assigned to them (attorney).",
    security,
    request: { params: idParam },
    responses: { 200: envelope(CaseResponseSchema, "Case."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/cases",
    tags: caseTags,
    summary: "List cases, paginated",
    description: "Staff-only, unscoped by assignment.",
    security,
    request: {
        query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            size: z.coerce.number().int().min(1).optional(),
            search: z.string().optional(),
            status: z.enum(["open", "pending", "closed", "on hold"]).optional(),
            client: z.string().optional(),
        }),
    },
    responses: { 200: envelope(z.array(CaseResponseSchema), "Cases."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "post",
    path: "/cases",
    tags: caseTags,
    summary: "Create a case",
    security,
    request: { body: { content: { "application/json": { schema: CreateCaseDTO } } } },
    responses: { 201: envelope(CaseResponseSchema, "Case created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/cases/{id}",
    tags: caseTags,
    summary: "Update a case",
    description: "A non-admin staff member may only edit a case they're the assignedAttorney on.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: UpdateCaseDTO } } } },
    responses: { 200: envelope(CaseResponseSchema, "Case updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/cases/{id}",
    tags: caseTags,
    summary: "Delete a case",
    description: "Admin-only.",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Case deleted."), ...commonErrors },
});

// ---- Case Requests (client intake -> staff review) --------------------

const requestTags = ["Case Requests"];

registry.registerPath({
    method: "post",
    path: "/case-requests",
    tags: requestTags,
    summary: "Submit a new-matter request",
    description: "Any authenticated user — a client requests a new case; does not create a real Case until a staff member approves it.",
    security,
    request: { body: { content: { "application/json": { schema: CreateCaseRequestDTO } } } },
    responses: { 201: envelope(CaseRequestResponseSchema, "Request submitted."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/case-requests/mine",
    tags: requestTags,
    summary: "Get the signed-in client's own case requests, any status",
    security,
    responses: { 200: envelope(z.array(CaseRequestResponseSchema), "The caller's requests."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/case-requests",
    tags: requestTags,
    summary: "List the review queue",
    description: "Any staff member, not admin-exclusive.",
    security,
    request: { query: z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }) },
    responses: { 200: envelope(z.array(CaseRequestResponseSchema), "Requests."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/case-requests/{id}",
    tags: requestTags,
    summary: "Get one case request by id",
    security,
    request: { params: idParam },
    responses: { 200: envelope(CaseRequestResponseSchema, "Case request."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/case-requests/{id}/approve",
    tags: requestTags,
    summary: "Approve a case request",
    description: "Creates the real Case and links it back to this request.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: ApproveCaseRequestDTO } } } },
    responses: { 200: envelope(CaseRequestResponseSchema, "Request approved, case created."), 400: errorEnvelope("Already reviewed."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/case-requests/{id}/reject",
    tags: requestTags,
    summary: "Reject a case request",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: RejectCaseRequestDTO } } } },
    responses: { 200: envelope(CaseRequestResponseSchema, "Request rejected."), 400: errorEnvelope("Already reviewed."), ...commonErrors },
});
