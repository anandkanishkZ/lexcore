// Runs before any module loads (see jest.config.js's setupFiles) so
// configs/constant.ts's dotenv.config() never overrides these — dotenv
// only fills in values that aren't already set.
process.env.SECRET_KEY = "test-secret-key-not-for-production";
process.env.CORS_ORIGIN = "http://localhost:3000";
// Explicitly unset (not just absent) so the AI "not configured" tests are
// hermetic regardless of what's in the real .env.
process.env.DEEPSEEK_API_KEY = "";
