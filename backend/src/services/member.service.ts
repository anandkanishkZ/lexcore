import { MemberMongoRepository, MemberQuery, Member } from "../repositories/member.repository";

const memberRepository = new MemberMongoRepository();

export class MemberService {
    async getAll(query: MemberQuery): Promise<{ data: Member[]; total: number }> {
        return await memberRepository.getAll(query);
    }
}
