import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MONGODB_URL } from "../src/configs/constant";

/**
 * Restores a backup written by scripts/backup.ts. Deliberately destructive
 * and deliberately hard to trigger by accident: every collection present in
 * the backup is fully replaced (not merged) and the live uploads/ directory
 * is deleted and replaced wholesale — so this refuses to run at all without
 * an explicit --confirm flag, and never runs implicitly from anywhere else
 * in the app.
 *
 * Note: the database side can be dry-run safely — connect to a throwaway
 * database before calling runRestore() and it reuses that open connection
 * instead of opening its own (see the readyState check below). UPLOAD_DIR
 * is always the real on-disk uploads/ directory regardless of which
 * database is targeted, though, so there's no equivalent isolated dry-run
 * for the uploads side yet.
 */

const BACKUP_ROOT = path.join(process.cwd(), "backups");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

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

export async function runRestore(backupName: string, options: { confirm: boolean }): Promise<void> {
    if (!options.confirm) {
        throw new Error(
            "Refusing to restore without --confirm — this replaces every collection in the live database and deletes the current uploads/ directory."
        );
    }

    const backupDir = path.join(BACKUP_ROOT, backupName);
    if (!fs.existsSync(backupDir)) {
        throw new Error(`Backup not found: ${backupDir}`);
    }

    const dbDir = path.join(backupDir, "db");
    const ownsConnection = mongoose.connection.readyState !== 1;
    if (ownsConnection) await mongoose.connect(MONGODB_URL);

    const db = mongoose.connection.db;
    if (!db) throw new Error("No active MongoDB connection to restore into.");

    const files = fs.existsSync(dbDir) ? (await fs.promises.readdir(dbDir)).filter((f) => f.endsWith(".json")) : [];
    for (const file of files) {
        const collectionName = file.replace(/\.json$/, "");
        const docs = JSON.parse(await fs.promises.readFile(path.join(dbDir, file), "utf-8"));
        const collection = db.collection(collectionName);
        await collection.deleteMany({});
        if (docs.length > 0) await collection.insertMany(docs);
        console.log(`[restore] restored ${docs.length} documents into ${collectionName}`);
    }

    const uploadsBackup = path.join(backupDir, "uploads");
    if (fs.existsSync(uploadsBackup)) {
        await fs.promises.rm(UPLOAD_DIR, { recursive: true, force: true });
        await copyDir(uploadsBackup, UPLOAD_DIR);
        console.log("[restore] restored uploads/");
    }

    if (ownsConnection) await mongoose.disconnect();
    console.log(`[restore] complete from ${backupDir}`);
}

if (require.main === module) {
    const backupName = process.argv[2];
    const confirm = process.argv.includes("--confirm");
    if (!backupName) {
        console.error("Usage: npx tsx scripts/restore.ts <backup-timestamp> --confirm");
        console.error("List available backups: ls backups/");
        process.exit(1);
    }
    runRestore(backupName, { confirm }).catch((error) => {
        console.error("[restore] failed:", error.message || error);
        process.exit(1);
    });
}
