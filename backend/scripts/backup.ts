import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MONGODB_URL } from "../src/configs/constant";

/**
 * A logical (driver-level) backup, not a `mongodump` binary dump — this
 * only needs the Node MongoDB driver already in the project's dependency
 * tree, not a separate MongoDB Database Tools install on whatever machine
 * runs it. Every collection is dumped to its own JSON file, and the entire
 * uploads/ tree (documents, avatars, chat attachments) is copied alongside
 * it, so one backup directory is everything needed to reconstruct the
 * system's state. Adequate at this project's scale; a `mongodump`-based
 * dump would be the natural upgrade once data volume justifies it.
 */

const BACKUP_ROOT = path.join(process.cwd(), "backups");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// How many timestamped backups to keep before pruning the oldest —
// overridable so a production deployment can tune retention without a
// code change.
const RETENTION_COUNT = Number(process.env.BACKUP_RETENTION_COUNT) || 14;

async function copyDir(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
}

async function pruneOldBackups(): Promise<void> {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    // Timestamp directory names (see runBackup) are ISO-based and sort
    // chronologically as plain strings — no need to parse dates.
    const entries = (await fs.promises.readdir(BACKUP_ROOT)).sort();
    const excess = entries.length - RETENTION_COUNT;
    if (excess <= 0) return;

    for (const dir of entries.slice(0, excess)) {
        await fs.promises.rm(path.join(BACKUP_ROOT, dir), { recursive: true, force: true });
        console.log(`[backup] pruned old backup: ${dir}`);
    }
}

/** Runs one full backup (DB + uploads) and returns the directory it wrote
 * to. Reuses an already-open Mongoose connection if the caller has one
 * (e.g. the in-process scheduler running inside the live server) — only
 * opens/closes its own when run standalone via the CLI. */
export async function runBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(BACKUP_ROOT, timestamp);
    const dbDir = path.join(backupDir, "db");
    await fs.promises.mkdir(dbDir, { recursive: true });

    const ownsConnection = mongoose.connection.readyState !== 1;
    if (ownsConnection) await mongoose.connect(MONGODB_URL);

    const db = mongoose.connection.db;
    if (!db) throw new Error("No active MongoDB connection to back up.");

    const collections = await db.listCollections().toArray();
    let totalDocs = 0;
    for (const { name } of collections) {
        const docs = await db.collection(name).find({}).toArray();
        await fs.promises.writeFile(path.join(dbDir, `${name}.json`), JSON.stringify(docs));
        totalDocs += docs.length;
    }
    console.log(`[backup] dumped ${collections.length} collections, ${totalDocs} documents`);

    if (fs.existsSync(UPLOAD_DIR)) {
        await copyDir(UPLOAD_DIR, path.join(backupDir, "uploads"));
        console.log("[backup] copied uploads/");
    }

    await fs.promises.writeFile(
        path.join(backupDir, "manifest.json"),
        JSON.stringify(
            {
                createdAt: new Date().toISOString(),
                collections: collections.map((c) => c.name),
                totalDocs,
            },
            null,
            2
        )
    );

    await pruneOldBackups();

    if (ownsConnection) await mongoose.disconnect();

    console.log(`[backup] complete: ${backupDir}`);
    return backupDir;
}

if (require.main === module) {
    runBackup().catch((error) => {
        console.error("[backup] failed:", error);
        process.exit(1);
    });
}
