import { ClientModel } from "../models/client.model";
import { UserModel } from "../models/user.model";

export interface MemberQuery {
    page: number;
    size: number;
    search?: string;
}

export interface Member {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    /**
     * Which collection this row's *displayed* data came from — `"account"`
     * (a User login with no linked CRM contact) or `"contact"` (a Client CRM
     * record — shown even if that person also has a login, see
     * [hasPortalAccess]). NOT a permission signal — use [isStaff] for that.
     */
    source: "account" | "contact";
    /**
     * The one authoritative "can this person be assigned staff-only work"
     * fact, computed server-side from the real User.role/userType — never
     * inferred from [source]. Always `false` for `source: "contact"` rows
     * (a CRM contact, even a linked one, was never staff).
     */
    isStaff: boolean;
    /**
     * Whether this person can sign in — true for every `source: "account"`
     * row (that's what it is) and for a `source: "contact"` row whose Client
     * has a `linkedUserId`. False only for a CRM-only contact who has never
     * logged in.
     */
    hasPortalAccess: boolean;
    subtype: string;
    status: string | null;
    createdAt: Date;
}

/**
 * Merges the Client (CRM) and User (login) collections into one sorted,
 * searched, paginated directory using $unionWith — so paging is correct at
 * the database level instead of capping a client-side fetch.
 *
 * A person who is both (a Client contact whose `linkedUserId` points at a
 * User login — see CaseRequestService.approve, which sets this link) is
 * shown as ONE row, sourced from their richer Client record, rather than
 * two unrelated rows for the same human. The User side excludes any account
 * already represented by a linked Client row via a $lookup + $match.
 */
export class MemberMongoRepository {
    async getAll(query: MemberQuery): Promise<{ data: Member[]; total: number }> {
        const { page, size, search } = query;
        const skip = (page - 1) * size;

        const searchMatch = search
            ? {
                  $or: [
                      { firstName: { $regex: search, $options: "i" } },
                      { lastName: { $regex: search, $options: "i" } },
                      { email: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const pipeline: any[] = [
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    email: 1,
                    phone: 1,
                    source: { $literal: "contact" },
                    isStaff: { $literal: false },
                    hasPortalAccess: { $ne: [{ $ifNull: ["$linkedUserId", null] }, null] },
                    subtype: "$type",
                    status: "$status",
                    createdAt: 1,
                },
            },
            {
                $unionWith: {
                    coll: UserModel.collection.name,
                    pipeline: [
                        {
                            $lookup: {
                                from: ClientModel.collection.name,
                                localField: "_id",
                                foreignField: "linkedUserId",
                                as: "_linkedContact",
                            },
                        },
                        // Already shown via its linked Client row above — skip
                        // the duplicate account-only row for the same person.
                        { $match: { _linkedContact: { $size: 0 } } },
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                email: 1,
                                phone: { $literal: null },
                                source: { $literal: "account" },
                                // Mirrors staffMiddleware's rule exactly: admin, or any
                                // non-client userType. A client's own login row must
                                // never evaluate to true here.
                                isStaff: {
                                    $or: [{ $eq: ["$role", "admin"] }, { $ne: ["$userType", "client"] }],
                                },
                                hasPortalAccess: { $literal: true },
                                subtype: {
                                    $cond: [{ $eq: ["$role", "admin"] }, "admin", "$userType"],
                                },
                                status: { $literal: null },
                                createdAt: 1,
                            },
                        },
                    ],
                },
            },
            ...(search ? [{ $match: searchMatch }] : []),
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: size }],
                    totalCount: [{ $count: "count" }],
                },
            },
        ];

        const [result] = await ClientModel.aggregate(pipeline);
        const data = result?.data ?? [];
        const total = result?.totalCount?.[0]?.count ?? 0;

        return { data, total };
    }
}
