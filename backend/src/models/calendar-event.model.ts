import mongoose, { Schema, Document } from "mongoose";

export interface ICalendarEvent extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    type: "hearing" | "meeting" | "deadline" | "reminder" | "other";
    date: Date;
    time?: string;
    duration?: number;
    location?: string;
    notes?: string;
    case?: mongoose.Types.ObjectId;
    participants: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CalendarEventMongoSchema = new Schema<ICalendarEvent>(
    {
        title: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["hearing", "meeting", "deadline", "reminder", "other"],
            default: "meeting",
        },
        date: { type: Date, required: true },
        time: { type: String },
        duration: { type: Number },
        location: { type: String, default: "" },
        notes: { type: String, default: "" },
        case: { type: Schema.Types.ObjectId, ref: "Case" },
        participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export const CalendarEventModel = mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventMongoSchema);
