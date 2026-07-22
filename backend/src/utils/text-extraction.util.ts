import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

// Tesseract.js downloads its ~5MB English language model on first use and
// caches it here on subsequent runs, instead of littering the project root
// (gitignored — see .gitignore's *.traineddata rule, kept as a backstop).
// process.cwd() rather than __dirname since the latter would differ between
// tsx (src/utils) and a tsc build (dist/src/utils) — both run from backend/.
const TESSERACT_CACHE_PATH = path.join(process.cwd(), ".cache", "tesseract");

const MAX_STORED_LENGTH = 50_000;

// Below this, a "successfully parsed" PDF is treated as having no real text
// layer (a scanned/photographed document) rather than genuine content.
const MIN_TEXT_LENGTH_BEFORE_OCR = 30;

// OCR takes several seconds per page — cap how many pages of a single
// scanned document get OCR'd so one huge upload can't run for minutes.
const MAX_OCR_PAGES = 15;

const WORD_MIME_TYPES = new Set([
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// Matches the upload middleware's accepted image types exactly (see
// case-file-upload.middleware.ts) — every image this app accepts can be
// uploaded from a phone camera (receipts, IDs, signed pages), so OCR is the
// only way any of them ever get searchable/summarizable text.
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ExtractionResult = {
    text?: string;
    /**
     * True when there's something worth running OCR on: a PDF that parsed
     * successfully but whose text layer was (near-)empty (scanned pages), or
     * any accepted image type (which never has an embedded text layer at
     * all — OCR is the only path, not a fallback). False for
     * corrupt/unreadable PDFs (nothing to rasterize) and every other type.
     * The caller uses this to decide whether to kick off background OCR, and
     * which extractor to use — see ocrPdfText vs ocrImageText.
     */
    needsOcr: boolean;
};

/**
 * Best-effort plain-text extraction for the AI search feature. Never
 * throws — a corrupt or scanned (image-only) PDF must not block the
 * upload it's attached to. Fast: only reads a PDF's embedded text layer,
 * never rasterizes/OCRs (see ocrPdfText for that, which is slow and meant
 * to run in the background, not inline with an upload request).
 */
export async function extractTextSafely(filePath: string, mimeType: string): Promise<ExtractionResult> {
    if (mimeType === "application/pdf") {
        try {
            const data = await fs.promises.readFile(filePath);
            const parser = new PDFParse({ data });
            let result;
            try {
                // pdf-parse's default pageJoiner injects a "-- N of M --"
                // marker between every page regardless of content — on a
                // scanned PDF with zero real text, those markers alone
                // exceed MIN_TEXT_LENGTH_BEFORE_OCR, masking the empty text
                // layer. A plain blank-line separator carries no noise.
                result = await parser.getText({ pageJoiner: "\n\n" });
            } finally {
                await parser.destroy();
            }

            const text = result.text.trim();
            if (text.length >= MIN_TEXT_LENGTH_BEFORE_OCR) {
                return { text: text.slice(0, MAX_STORED_LENGTH), needsOcr: false };
            }
            return { text: undefined, needsOcr: result.total > 0 };
        } catch (error) {
            console.error(`[text-extraction:error] failed to parse PDF ${filePath}:`, error);
            return { text: undefined, needsOcr: false };
        }
    }

    if (WORD_MIME_TYPES.has(mimeType)) {
        try {
            const { value } = await mammoth.extractRawText({ path: filePath });
            return { text: value.slice(0, MAX_STORED_LENGTH) || undefined, needsOcr: false };
        } catch (error) {
            console.error(`[text-extraction:error] failed to extract text from ${filePath}:`, error);
            return { text: undefined, needsOcr: false };
        }
    }

    // No embedded text layer exists on an image at all — unlike a PDF, this
    // isn't "try the fast path, fall back to OCR if it comes up empty";
    // OCR is the only extraction path, so this always signals needsOcr and
    // lets the caller run it as its own background step (see ocrImageText).
    if (IMAGE_MIME_TYPES.has(mimeType)) {
        return { text: undefined, needsOcr: true };
    }

    return { text: undefined, needsOcr: false };
}

/**
 * OCR fallback for scanned/photographed PDFs with no embedded text layer.
 * Rasterizes each page (pdf-parse's own getScreenshot, backed by
 * @napi-rs/canvas — a prebuilt native binary, no system Tesseract/canvas
 * install required) then runs Tesseract.js over each page image.
 *
 * Several seconds per page — always call this fire-and-forget from a
 * background job (see document.service.ts), never awaited on the upload
 * request itself, which would otherwise risk exceeding client timeouts
 * (e.g. the mobile app's 20s request timeout) on a multi-page document.
 */
export async function ocrPdfText(filePath: string): Promise<string | undefined> {
    try {
        const data = await fs.promises.readFile(filePath);
        const parser = new PDFParse({ data });
        let screenshots;
        try {
            screenshots = await parser.getScreenshot({ scale: 2, first: 1, last: MAX_OCR_PAGES });
        } finally {
            await parser.destroy();
        }

        await fs.promises.mkdir(TESSERACT_CACHE_PATH, { recursive: true });
        // Without an errorHandler, tesseract.js both rejects the pending
        // recognize() promise AND separately re-throws the same error inside
        // its own internal message handler (outside this function's call
        // stack) — an unhandled exception the try/catch below can't see. A
        // no-op handler suppresses that second throw; the catch below still
        // handles the (correctly rejected) promise.
        const worker = await createWorker("eng", undefined, { cachePath: TESSERACT_CACHE_PATH, errorHandler: () => {} });
        try {
            const pageTexts: string[] = [];
            for (const page of screenshots.pages) {
                if (!page.data) continue;
                const { data: ocrData } = await worker.recognize(Buffer.from(page.data));
                if (ocrData.text.trim()) pageTexts.push(ocrData.text.trim());
            }
            const combined = pageTexts.join("\n\n").trim();
            return combined ? combined.slice(0, MAX_STORED_LENGTH) : undefined;
        } finally {
            await worker.terminate();
        }
    } catch (error) {
        console.error(`[ocr:error] failed to OCR ${filePath}:`, error);
        return undefined;
    }
}

/**
 * OCR for a directly-uploaded image (jpg/png/webp) — a phone photo of a
 * receipt, ID, or signed page. Unlike ocrPdfText, there's no page
 * rasterization step: Tesseract reads the image file itself. Same
 * fire-and-forget background-job contract — call this from document.service
 * the same way, never awaited on the upload request.
 */
export async function ocrImageText(filePath: string): Promise<string | undefined> {
    try {
        await fs.promises.mkdir(TESSERACT_CACHE_PATH, { recursive: true });
        // Without an errorHandler, tesseract.js both rejects the pending
        // recognize() promise AND separately re-throws the same error inside
        // its own internal message handler (outside this function's call
        // stack) — an unhandled exception the try/catch below can't see. A
        // no-op handler suppresses that second throw; the catch below still
        // handles the (correctly rejected) promise.
        const worker = await createWorker("eng", undefined, { cachePath: TESSERACT_CACHE_PATH, errorHandler: () => {} });
        try {
            const { data } = await worker.recognize(filePath);
            const text = data.text.trim();
            return text ? text.slice(0, MAX_STORED_LENGTH) : undefined;
        } finally {
            await worker.terminate();
        }
    } catch (error) {
        console.error(`[ocr:error] failed to OCR image ${filePath}:`, error);
        return undefined;
    }
}
