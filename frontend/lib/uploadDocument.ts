// Client-side upload helper shared by the click-to-browse button and the
// drag-and-drop zone, so both go through one code path. Talks to the
// Next.js Route Handler at /api/documents (not a Server Action — see the
// comment in app/api/documents/route.ts for why: Server Actions cap request
// bodies at 1MB, too small for scanned PDFs).
export const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // matches case-file-upload.middleware.ts

export async function uploadDocument(
    caseId: string,
    folderId: string | undefined,
    file: File
): Promise<{ success: boolean; message?: string }> {
    if (file.size > MAX_UPLOAD_SIZE) {
        return { success: false, message: `${file.name} is larger than 20MB` };
    }

    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams({ case: caseId });
    if (folderId) params.set("folder", folderId);

    const res = await fetch(`/api/documents?${params}`, {
        method: "POST",
        body: formData,
    });
    return res.json();
}
