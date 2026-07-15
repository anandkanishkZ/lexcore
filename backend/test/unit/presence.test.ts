import { markOnline, markOffline, isOnline } from "../../src/socket/presence";

describe("socket presence (per-connection reference counting)", () => {
    it("stays online while at least one of several connections for the same user is still open", () => {
        const caseId = "case-1";
        const userId = "user-1";

        markOnline(caseId, userId); // tab 1
        markOnline(caseId, userId); // tab 2
        expect(isOnline(caseId, userId)).toBe(true);

        markOffline(caseId, userId); // tab 1 closes
        expect(isOnline(caseId, userId)).toBe(true); // tab 2 still open

        markOffline(caseId, userId); // tab 2 closes
        expect(isOnline(caseId, userId)).toBe(false);
    });

    it("does not go negative or leak state when markOffline is called more than markOnline", () => {
        const caseId = "case-2";
        const userId = "user-2";

        markOffline(caseId, userId);
        markOffline(caseId, userId);
        expect(isOnline(caseId, userId)).toBe(false);

        markOnline(caseId, userId);
        expect(isOnline(caseId, userId)).toBe(true);
    });

    it("tracks different users in the same case independently", () => {
        const caseId = "case-3";

        markOnline(caseId, "user-a");
        expect(isOnline(caseId, "user-a")).toBe(true);
        expect(isOnline(caseId, "user-b")).toBe(false);

        markOffline(caseId, "user-a");
        expect(isOnline(caseId, "user-a")).toBe(false);
    });
});
