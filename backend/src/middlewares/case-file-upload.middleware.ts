import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { HttpException } from "../exceptions/http-exception";

// Case documents live under uploads/cases/<caseId>/ — separate from the flat
// profile-image folder so per-case cleanup/browsing is straightforward.
export const CASE_FILES_DIR = path.join(process.cwd(), "uploads", "cases");
fs.mkdirSync(CASE_FILES_DIR, { recursive: true });

// The case id comes from the query string (?case=<id>), not the multipart
// body, on purpose: the access-control check in the route (see
// document.route.ts) runs on req.query before this middleware, so a
// non-owner is rejected before any bytes are written to disk. If "case"
// were a body field, multer would need to parse it before we could check
// ownership — leaving an orphaned file on disk for every rejected upload.
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const caseId = (req.query.case ?? "unknown").toString();
        const dir = path.join(CASE_FILES_DIR, caseId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

// Legal case documents: scans (PDF/images) and common office formats.
const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const documentFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new HttpException(400, "Unsupported file type"));
    }
};

export const caseFileUpload = multer({
    storage,
    fileFilter: documentFilter,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB — scanned PDFs run larger than avatar images
});
