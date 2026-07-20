import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { CaseFileResponseSchema, CaseFolderResponseSchema, DocumentRequestResponseSchema } from "./schemas";
import { CreateFolderDTO, UpdateFileDTO, UpdateFolderDTO, CopyFileDTO, ShareFileDTO } from "../dtos/document.dto";
import { CreateDocumentRequestDTO } from "../dtos/document-request.dto";

const security = bearerAuth;
const listing = z.object({ folders: z.array(CaseFolderResponseSchema), files: z.array(CaseFileResponseSchema) });
const binary = () => z.string().openapi({ type: "string", format: "binary" });

// ---- Documents ----------------------------------------------------------

const tags = ["Documents"];

registry.registerPath({
    method: "get",
    path: "/documents/recent",
    tags,
    summary: "Cross-case recent-files feed for the signed-in client",
    security,
    responses: { 200: envelope(z.array(CaseFileResponseSchema), "Recent files."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/documents/starred",
    tags,
    summary: "Cross-case starred files/folders",
    security,
    responses: { 200: envelope(listing, "Starred items."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "get",
    path: "/documents/trash",
    tags,
    summary: "Trashed files/folders for one case",
    security,
    request: { query: z.object({ case: z.string() }) },
    responses: { 200: envelope(listing, "Trashed items."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/documents/folders/all",
    tags,
    summary: "Every folder in one case, for a \"move to...\" picker",
    security,
    request: { query: z.object({ case: z.string(), exclude: z.string().optional() }) },
    responses: { 200: envelope(z.array(CaseFolderResponseSchema), "Folders."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/documents",
    tags,
    summary: "Folders + files at one level of a case's document tree",
    security,
    request: {
        query: z.object({
            case: z.string(),
            folder: z.string().optional().openapi({ description: "Omit for the case root." }),
            search: z.string().optional(),
            type: z.enum(["pdf", "image", "word", "excel"]).optional(),
            sortBy: z.enum(["name", "size", "createdAt"]).optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
        }),
    },
    responses: { 200: envelope(listing, "Listing."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents/folders",
    tags,
    summary: "Create a folder",
    security,
    request: { body: { content: { "application/json": { schema: CreateFolderDTO } } } },
    responses: { 201: envelope(CaseFolderResponseSchema, "Folder created."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents",
    tags,
    summary: "Upload a file into a case/folder",
    description: 'multipart/form-data, field "file". Every upload is scanned for disguised-executable signatures (and via ClamAV if configured) before being accepted.',
    security,
    request: {
        query: z.object({ case: z.string(), folder: z.string().optional() }),
        body: { content: { "multipart/form-data": { schema: z.object({ file: binary() }) } } },
    },
    responses: { 201: envelope(CaseFileResponseSchema, "File uploaded."), 400: errorEnvelope("Invalid file, or it failed the safety scan."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents/{id}/copy",
    tags,
    summary: "Copy a file",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: CopyFileDTO } } } },
    responses: { 201: envelope(CaseFileResponseSchema, "File copied."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents/{id}/restore",
    tags,
    summary: "Restore a trashed file",
    security,
    request: { params: idParam },
    responses: { 200: envelope(CaseFileResponseSchema, "File restored."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents/folders/{id}/restore",
    tags,
    summary: "Restore a trashed folder (and its contents)",
    security,
    request: { params: idParam },
    responses: { 200: envelope(CaseFolderResponseSchema, "Folder restored."), ...commonErrors },
});

registry.registerPath({
    method: "patch",
    path: "/documents/{id}",
    tags,
    summary: "Rename, move, or star/unstar a file",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: UpdateFileDTO } } } },
    responses: { 200: envelope(CaseFileResponseSchema, "File updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "patch",
    path: "/documents/folders/{id}",
    tags,
    summary: "Rename, move, or star/unstar a folder",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: UpdateFolderDTO } } } },
    responses: { 200: envelope(CaseFolderResponseSchema, "Folder updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/documents/{id}/download",
    tags,
    summary: "Download a file's bytes",
    security,
    request: { params: idParam },
    responses: { 200: { description: "The raw file stream.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } }, ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents/{id}/share",
    tags,
    summary: "Share a file with someone by email",
    description: "Grants access independent of case membership — viewer or editor.",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: ShareFileDTO } } } },
    responses: { 201: envelope(z.object({ _id: z.string(), email: z.string(), role: z.enum(["viewer", "editor"]) }), "Share created."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/documents/{id}/shares",
    tags,
    summary: "List everyone a file has been shared with",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.array(z.object({ _id: z.string(), email: z.string(), role: z.enum(["viewer", "editor"]) })), "Shares."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/documents/{id}/shares/{shareId}",
    tags,
    summary: "Revoke a share",
    security,
    request: { params: idParam.extend({ shareId: z.string() }) },
    responses: { 200: envelope(z.null(), "Share revoked."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/documents/{id}/versions",
    tags,
    summary: "Upload a new version of an existing file",
    description: 'multipart/form-data, field "file". The prior content is snapshotted before being overwritten.',
    security,
    request: { params: idParam, body: { content: { "multipart/form-data": { schema: z.object({ file: binary() }) } } } },
    responses: { 201: envelope(CaseFileResponseSchema, "New version uploaded."), 400: errorEnvelope("Invalid file, or it failed the safety scan."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/documents/{id}/versions",
    tags,
    summary: "List a file's version history",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.array(z.object({ _id: z.string(), size: z.number(), createdAt: z.string().datetime() })), "Versions."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/documents/{id}/versions/{versionId}/download",
    tags,
    summary: "Download a specific past version's bytes",
    security,
    request: { params: idParam.extend({ versionId: z.string() }) },
    responses: { 200: { description: "The raw file stream.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } }, ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/documents/{id}/permanent",
    tags,
    summary: "Permanently delete a (previously trashed) file",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "File permanently deleted."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/documents/folders/{id}/permanent",
    tags,
    summary: "Permanently delete a (previously trashed) folder and its contents",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Folder permanently deleted."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/documents/folders/{id}",
    tags,
    summary: "Move a folder (and its contents) to trash",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Folder trashed."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/documents/{id}",
    tags,
    summary: "Move a file to trash",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "File trashed."), ...commonErrors },
});

// ---- Document Requests (staff asks a client for a specific document) ----

const requestTags = ["Document Requests"];

registry.registerPath({
    method: "get",
    path: "/document-requests/mine",
    tags: requestTags,
    summary: "Get the signed-in client's own document requests, across every case they own",
    security,
    responses: { 200: envelope(z.array(DocumentRequestResponseSchema), "Requests."), 401: commonErrors[401] },
});

registry.registerPath({
    method: "post",
    path: "/document-requests/{id}/fulfill",
    tags: requestTags,
    summary: "Fulfill a document request with an already-uploaded file",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: z.object({ file: z.string().openapi({ description: "The CaseFile id returned by POST /documents." }) }) } } } },
    responses: { 200: envelope(DocumentRequestResponseSchema, "Request fulfilled."), 400: errorEnvelope("The file doesn't belong to this request's case, or the request is already fulfilled/cancelled."), ...commonErrors },
});

registry.registerPath({
    method: "get",
    path: "/document-requests",
    tags: requestTags,
    summary: "List document requests",
    description: "Any staff member.",
    security,
    request: { query: z.object({ case: z.string().optional(), status: z.enum(["pending", "fulfilled", "cancelled"]).optional() }) },
    responses: { 200: envelope(z.array(DocumentRequestResponseSchema), "Requests."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "post",
    path: "/document-requests",
    tags: requestTags,
    summary: "Ask a client to upload a specific document",
    security,
    request: { body: { content: { "application/json": { schema: CreateDocumentRequestDTO } } } },
    responses: { 201: envelope(DocumentRequestResponseSchema, "Request created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "post",
    path: "/document-requests/{id}/cancel",
    tags: requestTags,
    summary: "Cancel a document request",
    security,
    request: { params: idParam },
    responses: { 200: envelope(DocumentRequestResponseSchema, "Request cancelled."), ...commonErrors },
});
