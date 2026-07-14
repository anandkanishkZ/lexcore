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
            // Explicitly unset (not just absent) so the AI "not configured"
            // tests are hermetic regardless of what's in the real .env —
            // dotenv.config() never overrides an already-set process.env value.
            DEEPSEEK_API_KEY: "",
        },
    },
});
