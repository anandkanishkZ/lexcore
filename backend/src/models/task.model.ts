import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    status: "todo" | "in_progress" | "done";
    dueDate?: Date;
    assignee?: mongoose.Types.ObjectId;
    case?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TaskMongoSchema = new Schema<ITask>(
    {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
        dueDate: { type: Date },
        assignee: { type: Schema.Types.ObjectId, ref: "User" },
        case: { type: Schema.Types.ObjectId, ref: "Case" },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export const TaskModel = mongoose.model<ITask>("Task", TaskMongoSchema);
