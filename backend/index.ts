import http from "http";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import app, { PORT } from "./src/app";
import { connectToMongoDB } from "./src/database/mongodb";
import { CORS_ORIGINS } from "./src/configs/constant";
import { setIo } from "./src/socket/io-instance";
import { initChatGateway } from "./src/socket/chat.gateway";
import { CaseModel } from "./src/models/case.model";
import { CaseFileModel } from "./src/models/case-file.model";

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

async function start() {
    try {
        await connectToMongoDB();
        // $text queries (AI search) require the index to already exist —
        // ensure it's built before the server starts accepting requests,
        // rather than racing background index creation on a fresh database.
        await Promise.all([CaseModel.init(), CaseFileModel.init()]);
    } catch (error) {
        console.error("Fatal: could not connect to MongoDB, exiting.", error);
        process.exit(1);
    }

    // http.createServer(app), not app.listen() directly, so Socket.io can
    // attach to the same underlying server — one process, one port, no
    // separate service to deploy or CORS-configure independently.
    const server = http.createServer(app);
    const io = new SocketIOServer(server, { cors: { origin: CORS_ORIGINS } });
    setIo(io);
    initChatGateway(io);

    server.listen(PORT, () => {
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
