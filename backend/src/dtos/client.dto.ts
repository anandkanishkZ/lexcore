import { z } from "zod";
import { ClientSchema } from "../types/client.type";

export const CreateClientDTO = ClientSchema;
export type CreateClientDTO = z.infer<typeof CreateClientDTO>;

export const UpdateClientDTO = ClientSchema.partial();
export type UpdateClientDTO = z.infer<typeof UpdateClientDTO>;
