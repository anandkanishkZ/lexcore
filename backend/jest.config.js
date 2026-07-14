/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: ".",
    testMatch: ["<rootDir>/test/**/*.test.ts"],
    // process.env must be set before any module (e.g. configs/constant.ts's
    // dotenv.config()) loads — setupFiles runs before the test framework
    // globals are even installed, same timing vitest.config.ts's `test.env`
    // guaranteed.
    setupFiles: ["<rootDir>/test/jest.env.ts"],
    // beforeAll/afterEach/afterAll need the test framework globals, so this
    // runs one stage later than setupFiles.
    setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
    testTimeout: 30000,
    // mongodb-memory-server + Mongoose connections don't parallelize cleanly
    // across files sharing one in-memory server instance (same reasoning as
    // the old vitest.config.ts's fileParallelism: false).
    maxWorkers: 1,
};
