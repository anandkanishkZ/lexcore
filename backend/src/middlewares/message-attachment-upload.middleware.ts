import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { HttpException } from "../exceptions/http-exception";
import { MessageAttachmentKind } from "../models/message.model";

// Chat attachments live under uploads/messages/<caseId>/ — separate from
// uploads/cases/<caseId>/ (Documents/DMS) on purpose: a photo dropped into a
// conversation is not automatically a case document/record, mirroring how
// case-file-upload.middleware.ts keeps its own tree.
export const MESSAGE_ATTACHMENTS_DIR = path.join(process.cwd(), "uploads", "messages");
fs.mkdirSync(MESSAGE_ATTACHMENTS_DIR, { recursive: true });

// Same reasoning as case-file-upload.middleware.ts: the case id comes from
// the query string (?case=<id>), not the multipart body, so the
// access-control check in message.route.ts runs before multer writes
// anything to disk.
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const caseId = (req.query.case ?? "unknown").toString();
        const dir = path.join(MESSAGE_ATTACHMENTS_DIR, caseId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const ALLOWED_DOCUMENT = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
];
// Covers both the web (MediaRecorder → audio/webm) and mobile (native
// recorders typically produce audio/m4a or audio/aac) voice-note encoders.
const ALLOWED_AUDIO = [
    "audio/webm",
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/aac",
    "audio/x-m4a",
    "audio/m4a",
];

const ALL_ALLOWED = new Set([...ALLOWED_IMAGE, ...ALLOWED_DOCUMENT, ...ALLOWED_AUDIO]);

/** Used by MessageService to classify a stored attachment for the client
 * (which icon/preview to render) — deliberately an explicit allowlist
 * lookup, not a mimetype prefix guess, so it can never silently misclassify
 * something the filter let through under a new type we didn't anticipate. */
export function classifyAttachment(mimeType: string): MessageAttachmentKind {
    if (ALLOWED_IMAGE.includes(mimeType)) return "image";
    if (ALLOWED_AUDIO.includes(mimeType)) return "audio";
    if (ALLOWED_DOCUMENT.includes(mimeType)) return "document";
    return "other";
}

const attachmentFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALL_ALLOWED.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new HttpException(400, `Unsupported file type: ${file.mimetype}`));
    }
};

// 10 files/message and 25MB/file: generous enough for real use (scanned
// contracts, evidence photos, a multi-minute voice note) while still
// bounding a single request's worst case, enforced server-side regardless
// of what a client claims to be sending.
export const messageAttachmentUpload = multer({
    storage,
    fileFilter: attachmentFilter,
    limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});
