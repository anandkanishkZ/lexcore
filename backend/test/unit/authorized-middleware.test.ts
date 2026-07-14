import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authorizedMiddleware, adminMiddleware, staffMiddleware } from "../../src/middlewares/authorized.middleware";

// jest.mock calls are hoisted above imports by Jest's transform, so this
// registers before authorized.middleware (and its repository import) ever
// resolves — no need for the dynamic-import-after-mock dance vitest required.
jest.mock("../../src/repositories/user.repository", () => {
    class UserMongoRepository {
        async getUserById(id: string) {
            if (id === "known-user-id") return { _id: "known-user-id", role: "user", userType: "client" };
            return null;
        }
    }
    return { UserMongoRepository };
});

process.env.SECRET_KEY = process.env.SECRET_KEY ?? "test-secret-key-not-for-production";
const SECRET_KEY = process.env.SECRET_KEY!;

function mockRes() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe("authorizedMiddleware (unit, mocked repository)", () => {
    it("401s when no Authorization header is present", async () => {
        const req = { headers: {} } as Request;
        const res = mockRes();
        const next = jest.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("401s on an invalid/malformed token", async () => {
        const req = { headers: { authorization: "Bearer garbage" } } as Request;
        const res = mockRes();
        const next = jest.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("401s when the token is valid but the user no longer exists", async () => {
        const token = jwt.sign({ id: "deleted-user-id" }, SECRET_KEY);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = jest.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("attaches req.user and calls next() for a valid token", async () => {
        const token = jwt.sign({ id: "known-user-id" }, SECRET_KEY);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = jest.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect((req as any).user._id).toBe("known-user-id");
    });
});

describe("adminMiddleware (unit)", () => {
    it("403s a non-admin", () => {
        const req = { user: { role: "user" } } as Request;
        const res = mockRes();
        const next = jest.fn();

        adminMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls next() for an admin", () => {
        const req = { user: { role: "admin" } } as Request;
        const res = mockRes();
        const next = jest.fn();

        adminMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe("staffMiddleware (unit)", () => {
    it("403s a client", () => {
        const req = { user: { role: "user", userType: "client" } } as Request;
        const res = mockRes();
        const next = jest.fn();

        staffMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls next() for a non-admin, non-client staff member", () => {
        const req = { user: { role: "user", userType: "paralegal" } } as Request;
        const res = mockRes();
        const next = jest.fn();

        staffMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("calls next() for an admin regardless of userType", () => {
        const req = { user: { role: "admin", userType: "client" } } as Request;
        const res = mockRes();
        const next = jest.fn();

        staffMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});
