import { Request, Response } from "express";
import { MemberService } from "../services/member.service";
import { ApiResponseHelper } from "../utils/apihelper.util";
import { handleControllerError } from "../utils/error-handler.util";

const memberService = new MemberService();

export class MemberController {
    async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = (req.query.search as string) || undefined;

            const { data, total } = await memberService.getAll({ page, size, search });

            return ApiResponseHelper.success(res, data, "Members fetched successfully", 200, {
                page,
                limit: size,
                total,
            });
        } catch (error: any) {
            return handleControllerError(res, error, "MemberController");
        }
    }
}
