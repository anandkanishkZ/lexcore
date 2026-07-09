import dotenv from "dotenv";
dotenv.config();

export const PORT: number = Number(process.env.PORT) || 8089;
export const MONGODB_URL: string = process.env.MONGODB_URL || "mongodb://localhost:27017/lexcore-db";

// No fallback: a guessable default secret would let anyone forge a valid
// (e.g. admin-role) JWT offline. Fail loudly at startup instead.
if (!process.env.SECRET_KEY) {
    throw new Error("SECRET_KEY environment variable is required — set it in .env before starting the server.");
}
export const SECRET_KEY: string = process.env.SECRET_KEY;
