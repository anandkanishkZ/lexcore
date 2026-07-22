import fs from "fs";
import mongoose from "mongoose";
import { MONGODB_URL } from "../src/configs/constant";
import { CaseFileModel } from "../src/models/case-file.model";
import { ocrImageText } from "../src/utils/text-extraction.util";

/**
 * One-off backfill for files uploaded before image OCR existed — every
 * accepted image type (jpg/png/webp) with no extractedText yet gets OCR'd
 * in place. Safe to re-run: only ever touches files still missing text, so
 * an interrupted run just picks back up where it left off.
 */

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function run(): Promise<void> {
    const ownsConnection = mongoose.connection.readyState !== 1;
    if (ownsConnection) await mongoose.connect(MONGODB_URL);

    const files = await CaseFileModel.find({
        mimeType: { $in: IMAGE_MIME_TYPES },
        isDeleted: { $ne: true },
        $or: [{ extractedText: { $exists: false } }, { extractedText: "" }],
    });

    console.log(`[backfill-ocr] found ${files.length} image file(s) with no extracted text`);

    let succeeded = 0;
    let skippedMissing = 0;
    let failed = 0;

    for (const file of files) {
        if (!fs.existsSync(file.storagePath)) {
            console.warn(`[backfill-ocr] skipping ${file._id} — file missing on disk: ${file.storagePath}`);
            skippedMissing += 1;
            continue;
        }

        try {
            const text = await ocrImageText(file.storagePath);
            if (text) {
                await CaseFileModel.updateOne({ _id: file._id }, { $set: { extractedText: text } });
                succeeded += 1;
                console.log(`[backfill-ocr] extracted text for ${file._id} (${file.name})`);
            } else {
                console.log(`[backfill-ocr] no text found in ${file._id} (${file.name})`);
            }
        } catch (error) {
            failed += 1;
            console.error(`[backfill-ocr] failed on ${file._id} (${file.name}):`, error);
        }
    }

    console.log(`[backfill-ocr] done — ${succeeded} updated, ${skippedMissing} missing on disk, ${failed} failed`);

    if (ownsConnection) await mongoose.disconnect();
}

if (require.main === module) {
    run().catch((error) => {
        console.error("[backfill-ocr] fatal:", error);
        process.exit(1);
    });
}

export { run as backfillImageOcr };
