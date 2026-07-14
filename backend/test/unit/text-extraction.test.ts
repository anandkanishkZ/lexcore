import fs from "fs";
import os from "os";
import path from "path";
import { extractTextSafely } from "../../src/utils/text-extraction.util";

const tempFiles: string[] = [];

function writeTempFile(content: string, ext: string): string {
    const filePath = path.join(os.tmpdir(), `text-extraction-test-${Date.now()}-${Math.random()}${ext}`);
    fs.writeFileSync(filePath, content);
    tempFiles.push(filePath);
    return filePath;
}

afterEach(() => {
    for (const f of tempFiles.splice(0)) {
        fs.rmSync(f, { force: true });
    }
});

// A hand-built minimal PDF with a real content stream (`Tj` text-showing
// operator) — pdf-parse should read this back as genuine embedded text.
function minimalPdfWithText(content: string): string {
    return `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${content.length} >>
stream
${content}
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f
trailer << /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;
}

// Same structure, but with no /Contents at all — a valid one-page PDF with
// no text layer, mirroring a scanned/photographed page.
const MINIMAL_BLANK_PDF = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
xref
0 4
0000000000 65535 f
trailer << /Size 4 /Root 1 0 R >>
startxref
0
%%EOF`;

// A multi-page blank PDF — regression coverage for a real bug: pdf-parse's
// default pageJoiner inserts a "-- N of M --" marker between every page
// regardless of content, and across enough blank pages that boilerplate
// alone exceeded MIN_TEXT_LENGTH_BEFORE_OCR, masking a genuinely empty
// text layer as "real" content.
const MINIMAL_BLANK_PDF_MULTIPAGE = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
5 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
xref
0 6
0000000000 65535 f
trailer << /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

describe("extractTextSafely", () => {
    it("extracts real embedded text from a PDF and does not flag it for OCR", async () => {
        const pdf = minimalPdfWithText("BT /F1 24 Tf 10 100 Td (Hello, this is a real test document with a genuine text layer) Tj ET");
        const filePath = writeTempFile(pdf, ".pdf");

        const result = await extractTextSafely(filePath, "application/pdf");

        expect(result.needsOcr).toBe(false);
        expect(result.text).toContain("real test document");
    });

    it("flags a structurally valid but textless PDF for OCR (the scanned-document case)", async () => {
        const filePath = writeTempFile(MINIMAL_BLANK_PDF, ".pdf");

        const result = await extractTextSafely(filePath, "application/pdf");

        expect(result.text).toBeUndefined();
        expect(result.needsOcr).toBe(true);
    });

    it("flags a multi-page blank PDF for OCR, not fooled by page-joiner boilerplate", async () => {
        const filePath = writeTempFile(MINIMAL_BLANK_PDF_MULTIPAGE, ".pdf");

        const result = await extractTextSafely(filePath, "application/pdf");

        expect(result.text).toBeUndefined();
        expect(result.needsOcr).toBe(true);
    });

    it("does not flag a corrupt/unreadable PDF for OCR — nothing to rasterize", async () => {
        const filePath = writeTempFile("%PDF-1.4 not actually a valid pdf", ".pdf");

        const result = await extractTextSafely(filePath, "application/pdf");

        expect(result.text).toBeUndefined();
        expect(result.needsOcr).toBe(false);
    });

    it("never flags non-PDF types for OCR", async () => {
        const filePath = writeTempFile("not a real image", ".jpg");

        const result = await extractTextSafely(filePath, "image/jpeg");

        expect(result.text).toBeUndefined();
        expect(result.needsOcr).toBe(false);
    });
});
