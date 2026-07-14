import { NextResponse } from "next/server";
import { getTokenCookie } from "@/lib/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089";

/**
 * Proxies a new-version upload to the Express backend, same reasoning as
 * app/api/documents/route.ts: Server Actions cap request bodies at 1MB,
 * too small for scanned PDFs.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const token = await getTokenCookie();
    if (!token) {
        return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const contentType = req.headers.get("content-type") ?? "";
    const { searchParams } = new URL(req.url);

    const upstream = await fetch(`${API_URL}/api/v1/documents/${id}/versions?${searchParams.toString()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
        body: req.body,
        duplex: "half",
    } as RequestInit);

    const data = await upstream.json().catch(() => ({ success: false, message: "Upload failed" }));
    return NextResponse.json(data, { status: upstream.status });
}
