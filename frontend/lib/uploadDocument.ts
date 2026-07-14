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

/** Uploads a new version of an existing file — same size cap/route-handler
 * reasoning as uploadDocument above. `caseId` is only needed so the new
 * version's blob lands in the same uploads/cases/<caseId>/ folder as
 * everything else (multer's destination callback reads ?case= directly,
 * synchronously, so it can't look the case up from the file id itself). */
export async function uploadNewVersion(
    fileId: string,
    caseId: string,
    file: File
): Promise<{ success: boolean; message?: string }> {
    if (file.size > MAX_UPLOAD_SIZE) {
        return { success: false, message: `${file.name} is larger than 20MB` };
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/documents/${fileId}/versions?case=${caseId}`, {
        method: "POST",
        body: formData,
    });
    return res.json();
}
