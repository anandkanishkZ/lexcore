import { z } from "zod";
import { registry, envelope, errorEnvelope, commonErrors, bearerAuth, idParam } from "./registry";
import { TaskResponseSchema, CalendarEventResponseSchema } from "./schemas";
import { CreateTaskDTO, UpdateTaskDTO } from "../dtos/task.dto";
import { CalendarEventSchema } from "../types/calendar-event.type";

const security = bearerAuth;

// ---- Tasks --------------------------------------------------------------

const taskTags = ["Tasks"];

registry.registerPath({
    method: "get",
    path: "/tasks",
    tags: taskTags,
    summary: "List tasks",
    description: "Staff-only — an internal productivity tool, not client-visible.",
    security,
    request: { query: z.object({ status: z.enum(["todo", "in_progress", "done"]).optional(), case: z.string().optional(), assignee: z.string().optional() }) },
    responses: { 200: envelope(z.array(TaskResponseSchema), "Tasks."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/tasks/{id}",
    tags: taskTags,
    summary: "Get one task by id",
    security,
    request: { params: idParam },
    responses: { 200: envelope(TaskResponseSchema, "Task."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/tasks",
    tags: taskTags,
    summary: "Create a task",
    security,
    request: { body: { content: { "application/json": { schema: CreateTaskDTO } } } },
    responses: { 201: envelope(TaskResponseSchema, "Task created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/tasks/{id}",
    tags: taskTags,
    summary: "Update a task",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: UpdateTaskDTO } } } },
    responses: { 200: envelope(TaskResponseSchema, "Task updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/tasks/{id}",
    tags: taskTags,
    summary: "Delete a task",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Task deleted."), ...commonErrors },
});

// ---- Calendar Events ------------------------------------------------------

const eventTags = ["Calendar"];

registry.registerPath({
    method: "get",
    path: "/calendar-events",
    tags: eventTags,
    summary: "List calendar events",
    description: "Staff-only — the firm calendar isn't client-visible.",
    security,
    request: { query: z.object({ case: z.string().optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional() }) },
    responses: { 200: envelope(z.array(CalendarEventResponseSchema), "Events."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "get",
    path: "/calendar-events/{id}",
    tags: eventTags,
    summary: "Get one event by id",
    security,
    request: { params: idParam },
    responses: { 200: envelope(CalendarEventResponseSchema, "Event."), ...commonErrors },
});

registry.registerPath({
    method: "post",
    path: "/calendar-events",
    tags: eventTags,
    summary: "Create an event",
    description: 'A "hearing" type event is how court dates are tracked — there is no separate hearing model.',
    security,
    request: { body: { content: { "application/json": { schema: CalendarEventSchema } } } },
    responses: { 201: envelope(CalendarEventResponseSchema, "Event created."), 400: errorEnvelope("Validation failed."), 401: commonErrors[401], 403: commonErrors[403] },
});

registry.registerPath({
    method: "put",
    path: "/calendar-events/{id}",
    tags: eventTags,
    summary: "Update an event",
    security,
    request: { params: idParam, body: { content: { "application/json": { schema: CalendarEventSchema.partial() } } } },
    responses: { 200: envelope(CalendarEventResponseSchema, "Event updated."), 400: errorEnvelope("Validation failed."), ...commonErrors },
});

registry.registerPath({
    method: "delete",
    path: "/calendar-events/{id}",
    tags: eventTags,
    summary: "Delete an event",
    security,
    request: { params: idParam },
    responses: { 200: envelope(z.null(), "Event deleted."), ...commonErrors },
});
