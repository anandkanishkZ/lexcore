import mongoose from "mongoose";
import app, { PORT } from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

async function start() {
    try {
        await connectToMongoDB();
    } catch (error) {
        console.error("Fatal: could not connect to MongoDB, exiting.", error);
        process.exit(1);
    }

    const server = app.listen(PORT, () => {
        console.log(`Server: http://localhost:${PORT}`);
    });

    const shutdown = (signal: string) => {
        console.log(`${signal} received, shutting down gracefully...`);
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
