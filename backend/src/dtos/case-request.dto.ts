import { z } from "zod";
import { ApproveCaseRequestSchema, CreateCaseRequestSchema, RejectCaseRequestSchema } from "../types/case-request.type";

export const CreateCaseRequestDTO = CreateCaseRequestSchema;
export type CreateCaseRequestDTO = z.infer<typeof CreateCaseRequestDTO>;

export const ApproveCaseRequestDTO = ApproveCaseRequestSchema;
export type ApproveCaseRequestDTO = z.infer<typeof ApproveCaseRequestDTO>;

export const RejectCaseRequestDTO = RejectCaseRequestSchema;
export type RejectCaseRequestDTO = z.infer<typeof RejectCaseRequestDTO>;
