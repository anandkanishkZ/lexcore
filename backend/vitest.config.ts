import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./test/setup.ts"],
        testTimeout: 30000,
        hookTimeout: 30000,
        // mongodb-memory-server + Mongoose connections don't parallelize
        // cleanly across files sharing one in-memory server instance.
        fileParallelism: false,
        env: {
            SECRET_KEY: "test-secret-key-not-for-production",
            CORS_ORIGIN: "http://localhost:3000",
        },
    },
});
