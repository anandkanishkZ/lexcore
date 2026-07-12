import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

vi.mock("../../src/repositories/user.repository", () => {
    class UserMongoRepository {
        async getUserById(id: string) {
            if (id === "known-user-id") return { _id: "known-user-id", role: "user", userType: "client" };
            return null;
        }
    }
    return { UserMongoRepository };
});

process.env.SECRET_KEY = process.env.SECRET_KEY ?? "test-secret-key-not-for-production";

const { authorizedMiddleware, adminMiddleware, staffMiddleware } = await import("../../src/middlewares/authorized.middleware");
const SECRET_KEY = process.env.SECRET_KEY!;

function mockRes() {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
}

describe("authorizedMiddleware (unit, mocked repository)", () => {
    it("401s when no Authorization header is present", async () => {
        const req = { headers: {} } as Request;
        const res = mockRes();
        const next = vi.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("401s on an invalid/malformed token", async () => {
        const req = { headers: { authorization: "Bearer garbage" } } as Request;
        const res = mockRes();
        const next = vi.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("401s when the token is valid but the user no longer exists", async () => {
        const token = jwt.sign({ id: "deleted-user-id" }, SECRET_KEY);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = vi.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("attaches req.user and calls next() for a valid token", async () => {
        const token = jwt.sign({ id: "known-user-id" }, SECRET_KEY);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();
        const next = vi.fn();

        await authorizedMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect((req as any).user._id).toBe("known-user-id");
    });
});

describe("adminMiddleware (unit)", () => {
    it("403s a non-admin", () => {
        const req = { user: { role: "user" } } as Request;
        const res = mockRes();
        const next = vi.fn();

        adminMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls next() for an admin", () => {
        const req = { user: { role: "admin" } } as Request;
        const res = mockRes();
        const next = vi.fn();

        adminMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });
});

describe("staffMiddleware (unit)", () => {
    it("403s a client", () => {
        const req = { user: { role: "user", userType: "client" } } as Request;
        const res = mockRes();
        const next = vi.fn();

        staffMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls next() for a non-admin, non-client staff member", () => {
        const req = { user: { role: "user", userType: "paralegal" } } as Request;
        const res = mockRes();
        const next = vi.fn();

        staffMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });

    it("calls next() for an admin regardless of userType", () => {
        const req = { user: { role: "admin", userType: "client" } } as Request;
        const res = mockRes();
        const next = vi.fn();

        staffMiddleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });
});
