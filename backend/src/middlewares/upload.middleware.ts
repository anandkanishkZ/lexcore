import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { HttpException } from "../exceptions/http-exception";

// All uploads land in <project>/uploads. Created on startup so multer never
// fails because the folder is missing. This same folder is served statically
// from app.ts at /uploads.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        // profile-<userId>-<timestamp>.<ext> keeps names unique and traceable.
        const userId = (req.user?._id ?? "anon").toString();
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `profile-${userId}-${Date.now()}${ext}`);
    },
});

const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new HttpException(400, "Only JPEG, PNG and WebP images are allowed"));
    }
};

export const upload = multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
