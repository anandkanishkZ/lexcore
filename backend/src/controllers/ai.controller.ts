import { Request, Response } from "express";
import { AskAiDTO, ChatAboutDocumentDTO } from "../dtos/ai.dto";
import { AiService } from "../services/ai.service";
import { HttpException } from "../exceptions/http-exception";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const aiService = new AiService();

// handleControllerError flattens every 5xx into a generic "Something went
// wrong" 500 (deliberately, so internal error details never leak) — but
// "AI features are not configured" is an expected, safe-to-show state, not
// an internal error, so it's the one 5xx carved out to reach the client
// with its real status/message. Anything else (a genuine DeepSeek API
// failure, etc.) still gets flattened as usual.
function handleAiError(res: Response, error: any) {
    if (error instanceof HttpException && error.status === 503) {
        return ApiResponseHelper.error(res, error.message, 503);
    }
    return handleControllerError(res, error, "AiController");
}

export class AiController {
    async ask(req: Request, res: Response) {
        try {
            const parsed = AskAiDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            const data = await aiService.ask(parsed.data.query);
            return ApiResponseHelper.success(res, data, "Answer generated successfully", 200);
        } catch (error: any) {
            return handleAiError(res, error);
        }
    }

    async summarizeCase(req: Request, res: Response) {
        try {
            const data = await aiService.summarizeCase(req.params.id as string);
            return ApiResponseHelper.success(res, data, "Case summarized successfully", 200);
        } catch (error: any) {
            return handleAiError(res, error);
        }
    }

    async summarizeDocument(req: Request, res: Response) {
        try {
            const data = await aiService.summarizeDocument(req.params.id as string);
            return ApiResponseHelper.success(res, data, "Document summarized successfully", 200);
        } catch (error: any) {
            return handleAiError(res, error);
        }
    }

    async chatDocument(req: Request, res: Response) {
        try {
            const parsed = ChatAboutDocumentDTO.safeParse(req.body);
            if (!parsed.success) {
                return ApiResponseHelper.error(res, parsed.error.errors.map((e) => e.message).join(", "), 400);
            }
            // zod's inferred type for a .default([])-wrapped array of objects
            // marks the nested fields optional (a known type-inference quirk
            // in this zod version) even though it validates them as required
            // at runtime — the cast reflects what's actually guaranteed here.
            const history = parsed.data.history as { role: "user" | "assistant"; content: string }[];
            const data = await aiService.chatAboutDocument(req.params.id as string, parsed.data.query, history);
            return ApiResponseHelper.success(res, data, "Answer generated successfully", 200);
        } catch (error: any) {
            return handleAiError(res, error);
        }
    }
}
