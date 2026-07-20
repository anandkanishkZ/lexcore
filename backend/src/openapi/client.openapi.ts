import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { ClientResponseSchema } from "./schemas";
import { CreateClientDTO, UpdateClientDTO } from "../dtos/client.dto";

const tags = ["Clients"];
const security = bearerAuth;

registry.registerPath({
    method: "get",
    path: "/clients",
    tags,
    summary: "List clients, paginated",
    description: "Staff-only — the mobile client portal never calls this; a client sees their own data via /cases/mine etc.",
    security,
    request: {
        query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            size: z.coerce.number().int().min(1).optional(),
            search: z.string().optional(),
        }),
    },
    responses: { 200: envelope(z.array(ClientResponseSchema), "Clients."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/clients/{id}",
    tags,
    summary: "Get one client by id",
    security,
    request: { params: idParam },
    responses: { 200: envelope(ClientResponseSchema, "Client."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/clients",
    tags,
    summary: "Create a client",
    security,
    request: { body: { content: { "application/json": { schema: CreateClientDTO } } } },
    responses: { 201: envelope(ClientResponseSchema, "Client created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/clients/{id}",
    tags,
    summary: "Update a client",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: UpdateClientDTO } } } },
    responses: { 200: envelope(ClientResponseSchema, "Client updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/clients/{id}",
    tags,
    summary: "Delete a client",
    description: "Admin-only. Rejected if the client has linked cases or invoices.",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Client deleted."), 400: errorEnvelope("Client has linked cases/invoices and cannot be deleted."), ...commonErrors },
});
