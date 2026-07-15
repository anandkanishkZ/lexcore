import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../configs/constant";
import { UserMongoRepository } from "../repositories/user.repository";
import { CaseService } from "../services/case.service";
import { MessageService } from "../services/message.service";
import { markOnline, markOffline } from "./presence";

const userRepository = new UserMongoRepository();
const caseService = new CaseService();
const messageService = new MessageService();

/**
 * Wires up real-time chat on top of the shared Socket.io server created in
 * index.ts. Handshake auth mirrors authorized.middleware.ts exactly (verify
 * the JWT, load the full user) since a socket connection needs the same
 * identity REST requests get from the Authorization header.
 */
export function initChatGateway(io: Server): void {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token as string | undefined;
            if (!token) throw new Error("Token not found");
            const decoded = jwt.verify(token, SECRET_KEY) as { id: string };
            const user = await userRepository.getUserById(decoded.id);
            if (!user) throw new Error("User not found");
            socket.data.user = user;
            next();
        } catch (error: any) {
            next(new Error(error.message || "Unauthorized"));
        }
    });

    io.on("connection", (socket: Socket) => {
        const user = socket.data.user;
        // A Set, not a single caseId — a socket that ever joined more than
        // one case's room without disconnecting used to leak the first
        // case's presence entry forever (only the last-joined caseId was
        // ever cleaned up on disconnect). Idempotent against a duplicate
        // "join" for the same case too, so a re-emitted join on the same
        // still-open socket doesn't double-increment the presence count.
        const joinedCaseIds = new Set<string>();

        socket.on("join", async ({ caseId }: { caseId: string }) => {
            try {
                await caseService.assertChatAccess(caseId, {
                    role: user.role,
                    email: user.email,
                    userId: user._id.toString(),
                });
                socket.join(`case:${caseId}`);
                if (!joinedCaseIds.has(caseId)) {
                    joinedCaseIds.add(caseId);
                    markOnline(caseId, user._id.toString());
                }
            } catch (error: any) {
                socket.emit("error", { message: error.message || "Access denied" });
            }
        });

        // MessageService.send() emits "message:new" to the room itself, so
        // this handler doesn't re-broadcast — it's the same path the REST
        // POST /messages handler uses, just triggered over the socket.
        socket.on("message:send", async ({ caseId, content }: { caseId: string; content: string }) => {
            try {
                await messageService.send(
                    caseId,
                    { content },
                    { role: user.role, email: user.email, userId: user._id.toString() }
                );
            } catch (error: any) {
                socket.emit("error", { message: error.message || "Could not send message" });
            }
        });

        socket.on("disconnect", () => {
            for (const caseId of joinedCaseIds) markOffline(caseId, user._id.toString());
        });
    });
}
