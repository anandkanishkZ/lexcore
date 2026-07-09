import { z } from "zod";

export const CreateFolderDTO = z.object({
    case: z.string().min(1, "Case is required"),
    name: z.string().min(1, "Folder name is required"),
    parent: z.string().optional(),
});
export type CreateFolderDTO = z.infer<typeof CreateFolderDTO>;
