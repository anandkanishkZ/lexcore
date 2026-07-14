import { z } from "zod";

export const CreateFolderDTO = z.object({
    case: z.string().min(1, "Case is required"),
    name: z.string().min(1, "Folder name is required"),
    parent: z.string().optional(),
});
export type CreateFolderDTO = z.infer<typeof CreateFolderDTO>;

// PATCH /documents/:id — any subset of fields may be present (rename, move,
// star-toggle, or a combination, in one partial-update call). `folder: null`
// means "move to the case root", distinct from omitting the key ("don't
// change the current location").
export const UpdateFileDTO = z.object({
    name: z.string().min(1, "Name is required").optional(),
    folder: z.string().nullable().optional(),
    starred: z.boolean().optional(),
});
export type UpdateFileDTO = z.infer<typeof UpdateFileDTO>;

// PATCH /documents/folders/:id — same shape, but folders nest under `parent`.
export const UpdateFolderDTO = z.object({
    name: z.string().min(1, "Name is required").optional(),
    parent: z.string().nullable().optional(),
    starred: z.boolean().optional(),
});
export type UpdateFolderDTO = z.infer<typeof UpdateFolderDTO>;

export const CopyFileDTO = z.object({
    folder: z.string().nullable().optional(),
});
export type CopyFileDTO = z.infer<typeof CopyFileDTO>;

// POST /documents/:id/share — grants (or updates) one person's access to a
// single file by email, independent of case membership.
export const ShareFileDTO = z.object({
    email: z.string().email("A valid email is required"),
    role: z.enum(["viewer", "editor"]).default("viewer"),
});
export type ShareFileDTO = z.infer<typeof ShareFileDTO>;
