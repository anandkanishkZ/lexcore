import { z } from "zod";
import { CreateDocumentRequestSchema, FulfillDocumentRequestSchema } from "../types/document-request.type";

export const CreateDocumentRequestDTO = CreateDocumentRequestSchema;
export type CreateDocumentRequestDTO = z.infer<typeof CreateDocumentRequestDTO>;

export const FulfillDocumentRequestDTO = FulfillDocumentRequestSchema;
export type FulfillDocumentRequestDTO = z.infer<typeof FulfillDocumentRequestDTO>;
