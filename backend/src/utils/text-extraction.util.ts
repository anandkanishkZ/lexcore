import fs from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_STORED_LENGTH = 50_000;

const WORD_MIME_TYPES = new Set([
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Best-effort plain-text extraction for the AI search feature. Never throws
 * — a corrupt or scanned (image-only) PDF must not block the upload it's
 * attached to. Returns undefined for mime types we don't attempt (images,
 * spreadsheets) or when extraction fails.
 */
export async function extractTextSafely(filePath: string, mimeType: string): Promise<string | undefined> {
    try {
        if (mimeType === "application/pdf") {
            const data = await fs.promises.readFile(filePath);
            const parser = new PDFParse({ data });
            try {
                const result = await parser.getText();
                return result.text.slice(0, MAX_STORED_LENGTH) || undefined;
            } finally {
                await parser.destroy();
            }
        }

        if (WORD_MIME_TYPES.has(mimeType)) {
            const { value } = await mammoth.extractRawText({ path: filePath });
            return value.slice(0, MAX_STORED_LENGTH) || undefined;
        }

        return undefined;
    } catch (error) {
        console.error(`[text-extraction:error] failed to extract text from ${filePath}:`, error);
        return undefined;
    }
}
