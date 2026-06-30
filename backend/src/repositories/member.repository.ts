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
    category: "staff" | "client";
    subtype: string;
    status: string | null;
    createdAt: Date;
}

/**
 * Merges the Client (CRM) and User (staff login) collections into one
 * sorted, searched, and paginated result set using $unionWith — so paging
 * is correct at the database level instead of capping a client-side fetch.
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
                    category: { $literal: "client" },
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
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                email: 1,
                                phone: { $literal: null },
                                category: { $literal: "staff" },
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
