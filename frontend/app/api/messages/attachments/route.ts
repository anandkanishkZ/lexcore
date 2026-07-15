import { NextResponse } from "next/server";
import { getTokenCookie } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/**
 * Proxies chat attachment uploads to the Express backend instead of going
 * through a Server Action — same reasoning as app/api/documents/route.ts:
 * Server Actions have a 1MB default body limit, which a photo or a voice
 * note would hit constantly. Streams the multipart body straight through;
 * the httpOnly auth cookie is only readable here, server-side.
 */
export async function POST(req: Request) {
    const token = await getTokenCookie();
    if (!token) {
        return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contentType = req.headers.get("content-type") ?? "";

    const upstream = await fetch(`${API_URL}/api/v1/messages/attachments?${searchParams.toString()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
        body: req.body,
        // Required by undici/Node's fetch when streaming a ReadableStream body.
        duplex: "half",
    } as RequestInit);

    const data = await upstream.json().catch(() => ({ success: false, message: "Upload failed" }));
    return NextResponse.json(data, { status: upstream.status });
}
