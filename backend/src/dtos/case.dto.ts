import { z } from "zod";
import { CaseSchema } from "../types/case.type";

export const CreateCaseDTO = CaseSchema;
export type CreateCaseDTO = z.infer<typeof CreateCaseDTO>;

export const UpdateCaseDTO = CaseSchema.partial();
export type UpdateCaseDTO = z.infer<typeof UpdateCaseDTO>;
