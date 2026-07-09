import { NextResponse } from "next/server";
import { getTokenCookie } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/**
 * Streams a case file back through the frontend's own origin so a plain
 * <a href>/<img src>/<iframe src> can load it. Those tags can't set an
 * Authorization header, and the backend never reads cookies — this handler
 * bridges the two by reading the httpOnly cookie server-side and attaching
 * the Bearer token to the upstream request.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getTokenCookie();
    if (!token) {
        return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const upstream = await fetch(`${API_URL}/api/v1/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!upstream.ok) {
        const data = await upstream.json().catch(() => ({ success: false, message: "Failed to fetch file" }));
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
