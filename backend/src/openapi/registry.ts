import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

// Adds the .openapi() method to every Zod schema — must run before any
// schema in this app is annotated or registered below.
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: 'A token from POST /auth/login, sent as "Authorization: Bearer <token>".',
});

/** Every success response in this API shares this envelope
 * (ApiResponseHelper.success) — data's shape varies per endpoint, meta only
 * appears on paginated list endpoints. */
export function envelope(dataSchema: z.ZodTypeAny, description: string) {
    return {
        description,
        content: {
            "application/json": {
                schema: z.object({
                    status: z.number().openapi({ example: 200 }),
                    success: z.literal(true),
                    message: z.string(),
                    data: dataSchema,
                    meta: z
                        .object({
                            page: z.number(),
                            limit: z.number(),
                            total: z.number(),
                            totalPages: z.number(),
                        })
                        .optional(),
                }),
            },
        },
    };
}

/** Every error response in this API shares this shape (ApiResponseHelper.error). */
export const errorEnvelope = (description: string) => ({
    description,
    content: {
        "application/json": {
            schema: z.object({
                status: z.number(),
                success: z.literal(false),
                message: z.string(),
                data: z.null(),
            }),
        },
    },
});

/** The 401/403/404 trio nearly every protected, ownership-checked, or
 * :id-shaped route can return — spread into a path's `responses` alongside
 * whatever 200/201/400 that specific route also needs. */
export const commonErrors = {
    401: errorEnvelope("Missing, malformed, or expired Bearer token."),
    403: errorEnvelope("Authenticated, but not permitted to perform this action."),
    404: errorEnvelope("No resource exists with the given id."),
};

export const idParam = z.object({
    id: z.string().openapi({ example: "6597a1b2c3d4e5f678901234", description: "Mongo ObjectId" }),
});

export const bearerAuth = [{ bearerAuth: [] }];
