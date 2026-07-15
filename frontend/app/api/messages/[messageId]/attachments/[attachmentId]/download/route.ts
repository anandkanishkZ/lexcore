import { NextResponse } from "next/server";
import { getTokenCookie } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/**
 * Streams a chat attachment back through the frontend's own origin so a
 * plain <a href>/<img src>/<audio src> can load it — mirrors
 * app/api/documents/[id]/download/route.ts exactly. Those tags can't set an
 * Authorization header; this bridges the two by reading the httpOnly cookie
 * server-side and attaching the Bearer token to the upstream request.
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
    const { messageId, attachmentId } = await params;
    const token = await getTokenCookie();
    if (!token) {
        return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const upstream = await fetch(`${API_URL}/api/v1/messages/${messageId}/attachments/${attachmentId}/download`, {
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
