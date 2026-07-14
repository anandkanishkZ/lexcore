import { beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { CaseModel } from "../src/models/case.model";
import { CaseFileModel } from "../src/models/case-file.model";

let mongod: MongoMemoryServer;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    // $text queries require the index to actually exist server-side (unlike
    // regular indexes, which just fall back to a collection scan) — index
    // creation otherwise happens in the background and can race the first
    // AI search test against a fresh in-memory database.
    await Promise.all([CaseModel.init(), CaseFileModel.init()]);
}, 60000);

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
}, 60000);
