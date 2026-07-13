import { Server } from "socket.io";

/**
 * Holds the single Socket.io server instance so services (MessageService)
 * can emit to a room without every call site threading `io` through as a
 * parameter. Set once in index.ts right after the server is created.
 */
let ioInstance: Server | null = null;

export function setIo(io: Server): void {
    ioInstance = io;
}

export function getIo(): Server | null {
    return ioInstance;
}
