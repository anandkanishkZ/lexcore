import { z } from "zod";
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Side-effect imports — each of these calls registry.registerPath(...) for
// its resource. Import order doesn't matter to the generator, but grouping
// mirrors the routes/controllers/dtos split every other part of this
// backend already uses per resource.
import "./user.openapi";
import "./admin-user.openapi";
import "./client.openapi";
import "./case.openapi";
import "./document.openapi";
import "./invoice.openapi";
import "./task.openapi";
import "./message.openapi";
import "./ai.openapi";
import "./misc.openapi";

registry.registerPath({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Liveness check",
    description: "Public, unauthenticated. Used by uptime monitors and the mobile app's Connection Settings screen.",
    responses: {
        200: {
            description: "The API and its database connection are both up.",
            content: { "application/json": { schema: z.object({ status: z.number(), success: z.literal(true), message: z.string(), data: z.object({ uptime: z.number(), database: z.literal("connected") }) }) } },
        },
        503: {
            description: "The API is up but the database is not connected.",
            content: { "application/json": { schema: z.object({ status: z.number(), success: z.literal(false), message: z.string(), data: z.null() }) } },
        },
    },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
    openapi: "3.0.3",
    info: {
        title: "Lexcore API",
        version: "1.0.0",
        description:
            "REST API for the Lexcore law firm management platform, backing both the staff web console and the client-portal mobile app. " +
            'Every response shares one envelope: `{ status, success, message, data, meta? }`. Authenticate by logging in via POST /auth/login, ' +
            'then send the returned token as `Authorization: Bearer <token>` on every subsequent request — click "Authorize" below and paste it in.',
    },
    servers: [{ url: "/api/v1", description: "This server" }],
});
