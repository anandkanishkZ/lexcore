import { NextResponse } from "next/server";
import { getTokenCookie } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/** Same bridging reasoning as app/api/documents/[id]/download/route.ts, for
 * an archived (non-current) version's bytes. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
    const { id, versionId } = await params;
    const token = await getTokenCookie();
    if (!token) {
        return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const upstream = await fetch(`${API_URL}/api/v1/documents/${id}/versions/${versionId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!upstream.ok) {
        const data = await upstream.json().catch(() => ({ success: false, message: "Failed to fetch version" }));
        return NextResponse.json(data, { status: upstream.status });
    }

    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
            "Content-Disposition": upstream.headers.get("content-disposition") ?? "inline",
        },
    });
}
