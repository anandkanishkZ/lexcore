import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { UserResponseSchema } from "./schemas";
import { AdminCreateUserDTO, AdminUpdateUserDTO } from "../dtos/user.dto";

const tags = ["Admin: Users"];
const security = bearerAuth;

registry.registerPath({
    method: "get",
    path: "/admin/users",
    tags,
    summary: "List every user (staff and clients), paginated",
    security,
    request: {
        query: z.object({
            page: z.coerce.number().int().min(1).optional(),
            size: z.coerce.number().int().min(1).optional(),
            search: z.string().optional(),
        }),
    },
    responses: { 200: envelope(z.array(UserResponseSchema), "Users."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/admin/users/{id}",
    tags,
    summary: "Get one user by id",
    security,
    request: { params: idParam },
    responses: { 200: envelope(UserResponseSchema, "User."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/admin/users",
    tags,
    summary: "Create a staff or client account",
    description: "Unlike public registration, an admin may set userType/role directly.",
    security,
    request: { body: { content: { "application/json": { schema: AdminCreateUserDTO } } } },
    responses: { 201: envelope(UserResponseSchema, "User created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/admin/users/{id}",
    tags,
    summary: "Update any field on a user, including userType/role",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: AdminUpdateUserDTO } } } },
    responses: { 200: envelope(UserResponseSchema, "User updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "patch",
    path: "/admin/users/{id}/status",
    tags,
    summary: "Activate or deactivate a user",
    description: "A deactivated account still exists (historical case/task/invoice references stay resolvable) but can no longer log in. An admin cannot deactivate their own account.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: z.object({ isActive: z.boolean() }) } } } },
    responses: { 200: envelope(UserResponseSchema, "Status updated."), 400: errorEnvelope("Cannot deactivate your own account."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/admin/users/{id}",
    tags,
    summary: "Delete a user",
    description: "An admin cannot delete their own account.",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "User deleted."), 400: errorEnvelope("Cannot delete your own account."), ...commonErrors },
});
