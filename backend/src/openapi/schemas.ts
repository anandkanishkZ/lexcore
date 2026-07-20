import { z } from "zod";
import { registry } from "./registry";

// Response-shape schemas, registered once and reused by every resource's
// path file (registry.registerPath's `responses`) via $ref — these describe
// what a Mongoose document actually serializes to, not the create/update
// input contract (that's the DTOs in src/dtos/, reused as-is for request
// bodies). Loosely typed on purpose: only the fields a client can rely on
// are declared, matching how this API has never had a strict response
// contract beyond the {status,success,message,data} envelope itself.

export const UserResponseSchema = registry.register(
    "User",
    z.object({
        _id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        userType: z.string(),
        role: z.enum(["admin", "user"]),
        isActive: z.boolean(),
        profileImage: z.string().optional(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
    })
);

export const ClientResponseSchema = registry.register(
    "Client",
    z.object({
        _id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        type: z.enum(["individual", "organization"]),
        status: z.enum(["active", "inactive"]),
        createdAt: z.string().datetime(),
    })
);

export const CaseResponseSchema = registry.register(
    "Case",
    z.object({
        _id: z.string(),
        title: z.string(),
        caseNumber: z.string(),
        type: z.string(),
        status: z.enum(["open", "pending", "closed", "on hold"]),
        client: z.union([z.string(), ClientResponseSchema]),
        assignedAttorney: z.union([z.string(), UserResponseSchema]).nullable().optional(),
        description: z.string().optional(),
        openDate: z.string().datetime().optional(),
        closeDate: z.string().datetime().nullable().optional(),
        createdAt: z.string().datetime(),
    })
);

export const CaseFileResponseSchema = registry.register(
    "CaseFile",
    z.object({
        _id: z.string(),
        name: z.string(),
        case: z.string(),
        folder: z.string().nullable(),
        mimeType: z.string(),
        size: z.number(),
        starred: z.boolean(),
        isDeleted: z.boolean(),
        createdAt: z.string().datetime(),
    })
);

export const CaseFolderResponseSchema = registry.register(
    "CaseFolder",
    z.object({
        _id: z.string(),
        name: z.string(),
        case: z.string(),
        parent: z.string().nullable(),
        createdAt: z.string().datetime(),
    })
);

export const TaskResponseSchema = registry.register(
    "Task",
    z.object({
        _id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]),
        status: z.enum(["todo", "in_progress", "done"]),
        dueDate: z.string().datetime().optional(),
        assignee: z.union([z.string(), UserResponseSchema]).optional(),
        case: z.union([z.string(), CaseResponseSchema]).optional(),
        createdAt: z.string().datetime(),
    })
);

export const CalendarEventResponseSchema = registry.register(
    "CalendarEvent",
    z.object({
        _id: z.string(),
        title: z.string(),
        type: z.string(),
        startsAt: z.string().datetime(),
        endsAt: z.string().datetime().optional(),
        case: z.union([z.string(), CaseResponseSchema]).nullable().optional(),
        participants: z.array(z.string()).optional(),
        createdAt: z.string().datetime(),
    })
);

export const InvoiceResponseSchema = registry.register(
    "Invoice",
    z.object({
        _id: z.string(),
        invoiceNumber: z.string(),
        client: z.union([z.string(), ClientResponseSchema]),
        case: z.union([z.string(), CaseResponseSchema]).nullable().optional(),
        items: z.array(
            z.object({ description: z.string(), quantity: z.number(), rate: z.number(), amount: z.number() })
        ),
        subtotal: z.number(),
        taxRate: z.number(),
        tax: z.number(),
        total: z.number(),
        paidAmount: z.number(),
        status: z.enum(["draft", "sent", "paid", "void"]),
        dueDate: z.string().datetime(),
        createdAt: z.string().datetime(),
    })
);

export const PaymentResponseSchema = registry.register(
    "Payment",
    z.object({
        _id: z.string(),
        invoice: z.string(),
        amount: z.number(),
        method: z.enum(["cash", "bank_transfer", "card", "cheque", "esewa", "other"]),
        receiptNumber: z.string(),
        gatewayRef: z.string().optional(),
        date: z.string().datetime(),
        notes: z.string().optional(),
    })
);

export const MessageResponseSchema = registry.register(
    "Message",
    z.object({
        _id: z.string(),
        case: z.string(),
        sender: z.union([z.string(), UserResponseSchema]),
        content: z.string(),
        attachments: z
            .array(
                z.object({
                    fileName: z.string(),
                    originalName: z.string(),
                    mimeType: z.string(),
                    size: z.number(),
                    kind: z.enum(["image", "document", "audio", "other"]),
                    duration: z.number().optional(),
                })
            )
            .optional(),
        createdAt: z.string().datetime(),
    })
);

export const NotificationResponseSchema = registry.register(
    "Notification",
    z.object({
        _id: z.string(),
        recipient: z.string(),
        title: z.string(),
        message: z.string(),
        linkedEntityType: z.string().optional(),
        linkedEntityId: z.string().optional(),
        isRead: z.boolean(),
        createdAt: z.string().datetime(),
    })
);

export const CaseRequestResponseSchema = registry.register(
    "CaseRequest",
    z.object({
        _id: z.string(),
        title: z.string(),
        type: z.string(),
        description: z.string(),
        phone: z.string(),
        status: z.enum(["pending", "approved", "rejected"]),
        requestedBy: z.union([z.string(), UserResponseSchema]),
        reviewedBy: z.union([z.string(), UserResponseSchema]).nullable().optional(),
        createdAt: z.string().datetime(),
    })
);

export const DocumentRequestResponseSchema = registry.register(
    "DocumentRequest",
    z.object({
        _id: z.string(),
        case: z.union([z.string(), CaseResponseSchema]),
        title: z.string(),
        notes: z.string().optional(),
        status: z.enum(["pending", "fulfilled", "cancelled"]),
        fulfilledFile: z.string().nullable().optional(),
        createdAt: z.string().datetime(),
    })
);

export const AuditLogResponseSchema = registry.register(
    "AuditLog",
    z.object({
        _id: z.string(),
        actor: z.union([z.string(), UserResponseSchema]),
        action: z.string(),
        entityType: z.string(),
        entityId: z.string().optional(),
        metadata: z.string().optional(),
        createdAt: z.string().datetime(),
    })
);

export const FirmSettingsResponseSchema = registry.register(
    "FirmSettings",
    z.object({
        _id: z.string(),
        name: z.string(),
        logoUrl: z.string(),
        address: z.string(),
        phone: z.string(),
        email: z.string(),
        website: z.string(),
        currency: z.string(),
        practiceAreas: z.array(z.string()),
        esewaEnabled: z.boolean(),
        esewaEnvironment: z.enum(["test", "live"]),
        esewaClientId: z.string(),
        esewaSecretConfigured: z.boolean(),
        updatedAt: z.string().datetime(),
    })
);
