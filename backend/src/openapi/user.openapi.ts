import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth } from "./registry";
import { UserResponseSchema } from "./schemas";
import {
    CreateUserDTO,
    LoginUserDTO,
    UpdateUserDTO,
    ChangePasswordDTO,
    ForgotPasswordDTO,
    ResetPasswordDTO,
} from "../dtos/user.dto";

const tags = ["Auth"];

registry.registerPath({
    method: "post",
    path: "/auth/register",
    tags,
    summary: "Self-register a new client account",
    description: "Public — always creates userType \"client\". Staff accounts are created by an admin via /admin/users.",
    request: { body: { content: { "application/json": { schema: CreateUserDTO } } } },
    responses: {
        201: envelope(UserResponseSchema, "Account created."),
        400: errorEnvelope("Validation failed, or the email is already registered."),
    },
});

registry.registerPath({
    method: "post",
    path: "/auth/login",
    tags,
    summary: "Sign in",
    request: { body: { content: { "application/json": { schema: LoginUserDTO } } } },
    responses: {
        200: envelope(z.object({ user: UserResponseSchema, token: z.string() }), "Signed in."),
        400: errorEnvelope("Invalid credentials, or the account has been deactivated."),
    },
});

registry.registerPath({
    method: "post",
    path: "/auth/forgot-password",
    tags,
    summary: "Request a password-reset email",
    description: "Always resolves the same way regardless of whether the email is registered, to avoid leaking account existence.",
    request: { body: { content: { "application/json": { schema: ForgotPasswordDTO } } } },
    responses: { 200: envelope(z.null(), "A reset email was sent, if the address is registered.") },
});

registry.registerPath({
    method: "post",
    path: "/auth/reset-password",
    tags,
    summary: "Consume a password-reset token",
    request: { body: { content: { "application/json": { schema: ResetPasswordDTO } } } },
    responses: {
        200: envelope(z.null(), "Password updated."),
        400: errorEnvelope("Token is invalid, expired, or already used."),
    },
});

registry.registerPath({
    method: "get",
    path: "/auth/me",
    tags,
    summary: "Get the signed-in user's own profile",
    security: bearerAuth,
    responses: { 200: envelope(UserResponseSchema, "Current user."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/auth/whoami",
    tags,
    summary: "Get the signed-in user's own profile (alias of /auth/me)",
    security: bearerAuth,
    responses: { 200: envelope(UserResponseSchema, "Current user."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "put",
    path: "/auth/update",
    tags,
    summary: "Update the signed-in user's own profile fields",
    description: "multipart/form-data — accepts an optional \"profileImage\" file alongside the JSON fields in UpdateUserDTO.",
    security: bearerAuth,
    request: {
        body: {
            content: {
                "multipart/form-data": {
                    schema: UpdateUserDTO.extend({ profileImage: z.string().openapi({ type: "string", format: "binary" }).optional() }),
                },
            },
        },
    },
    responses: { 200: envelope(UserResponseSchema, "Profile updated."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "put",
    path: "/auth/password",
    tags,
    summary: "Change the signed-in user's own password",
    description: "Requires the current password — this is not an admin password reset.",
    security: bearerAuth,
    request: { body: { content: { "application/json": { schema: ChangePasswordDTO } } } },
    responses: {
        200: envelope(z.null(), "Password changed."),
        400: errorEnvelope("Current password is incorrect, or the new password fails the strength policy."),
        401: commonErrors[401],
    },
});

registry.registerPath({
    method: "post",
    path: "/auth/profile/image",
    tags,
    summary: "Upload/replace the signed-in user's profile picture",
    description: 'multipart/form-data, field name "image".',
    security: bearerAuth,
    request: {
        body: { content: { "multipart/form-data": { schema: z.object({ image: z.string().openapi({ type: "string", format: "binary" }) }) } } },
    },
    responses: { 200: envelope(UserResponseSchema, "Profile image updated."), 401: commonErrors[401] },
});
