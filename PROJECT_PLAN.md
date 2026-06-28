# Lexcore — Project Plan

## System Scope

**Single Branch Law Firm Management Platform**

- Web app (admin/staff) + Client portal (limited access)
- Core backbone: `Client → Case → Matter → Tasks/Calendar → Billing → Drive-like Documents`

---

## Module Breakdown

### 1. Users, Roles & Permissions (RBAC)

#### 1.1 Default Roles

| Role       | Scope                        |
| ---------- | ---------------------------- |
| Admin      | Full system access           |
| Partner    | Cases, billing, reports      |
| Associate  | Assigned cases, tasks        |
| Paralegal  | Tasks, documents, calendar   |
| Accountant | Billing, invoices, ledger    |
| Client     | Portal-only / shared access  |

#### 1.2 Permission System

- Module-level permissions (Clients, Cases, Documents, Billing, Reports, Settings)
- Case/Matter-level access control (assigned team only)
- Document-level access control (override inside a matter)
- Invite-only external access via email (for clients/third parties)

#### 1.3 Implementation Plan

**Backend:**

- `Role` model — name, permissions array, isDefault flag
- `Permission` model — module, action (create/read/update/delete), scope (own/team/all)
- RBAC middleware — checks `req.user.role.permissions` against route requirements
- Seed default roles on first run

**Frontend:**

- Admin panel: role CRUD, permission matrix (checkbox grid)
- Role assignment on user invite/edit
- UI guard components: `<Can module="billing" action="read">` wrapper

---

### 2. Firm Setup & Global Settings

#### 2.1 Firm Profile

- Logo, letterhead, address, phone, email, website
- Practice areas (Civil, Criminal, Corporate, Family, Tax, etc.)

#### 2.2 Staff Profiles

- Designation, bar license number, expertise tags
- Availability / workload capacity

#### 2.3 Global Settings

- Currency, timezone
- Invoice templates, tax/VAT rates
- Numbering rules (Client ID format, Case No format, Invoice No format)
- Document naming rules & default folder structures

#### 2.4 Implementation Plan

**Backend:**

- `FirmSettings` model (singleton document) — logo URL, address, currency, timezone, numbering rules
- `PracticeArea` model — name, description, isActive
- Extend `User` model — designation, barLicense, expertise[], availability
- Settings API: `GET/PUT /api/v1/settings/firm`
- Practice areas API: full CRUD

**Frontend:**

- Settings page with tabs: General, Billing, Numbering, Templates
- Practice area management (list + add/edit modal)
- Staff profile extended form

---

### 3. Client & Contact Management (CRM)

#### 3.1 Client Onboarding

- Individual or Company type
- KYC / ID document upload (linked into Drive folders)

#### 3.2 Contacts & Related Parties

- Types: opponent, witness, vendor, insurer, mediator, court officer
- Link contacts to clients and cases

#### 3.3 Client Relationship Mapping

- Company → directors, subsidiaries, authorized signatories

#### 3.4 Communication Log

- Calls, meetings, notes, email logs (linked to cases)

#### 3.5 Search & Organization

- Tags, segmentation, advanced search & filters
- Conflict warning: show related parties already in system

#### 3.6 Implementation Plan

**Backend:**

- `Client` model — type (individual/company), name, email, phone, address, tags[], KYC status
- `Contact` model — name, role/type, email, phone, linkedClients[], linkedCases[]
- `Relationship` model — fromEntity, toEntity, type (director/subsidiary/signatory)
- `CommunicationLog` model — type (call/meeting/note/email), content, date, linkedCase, linkedClient
- APIs: full CRUD for clients, contacts, relationships, communication logs
- Search API with filters: tags, type, date range, linked case

**Frontend:**

- Client list with pagination, search, filters
- Client detail page: profile, contacts, cases, documents, communication log
- Contact management: add/link contacts to clients/cases
- Onboarding wizard: basic info → KYC upload → assign practice area
- Conflict check UI: warning banner when related parties overlap

---

### 4. Case / Matter Management (Legal Workflow)

#### 4.1 Case Types

- Litigation, Advisory, Corporate

#### 4.2 Customizable Stages/Workflows

- Per practice area (e.g., Civil: Filing → Hearing → Arguments → Judgment)

#### 4.3 Assigned Team

- Lead lawyer + assistants + accountant visibility (optional)

#### 4.4 Timeline & Key Dates

- Hearings, deadlines, filings, reminders

#### 4.5 Court/Authority Details

- Court, bench, jurisdiction, case number, judge (optional)
- Opponent party & advocate details

#### 4.6 Notes

- Matter notes, strategy notes (private), internal-only flags

#### 4.7 Checklists & Templates

- Checklists per matter (filing checklist, hearing prep, etc.)
- Matter templates: prebuilt tasks + default folders + doc templates

#### 4.8 Implementation Plan

**Backend:**

- `Case` model — title, caseNumber, type, client, practiceArea, status, stage, assignedTeam[]
- `Matter` model — case reference, type, stages[], currentStage, dates{}
- `CourtDetail` model — court, bench, jurisdiction, caseNumber, judge, opponent, opposingCounsel
- `CaseNote` model — content, type (general/strategy), isPrivate, author, matter
- `Checklist` model — matter, items[{text, checked, assignee}]
- `MatterTemplate` model — name, practiceArea, defaultTasks[], defaultFolders[], defaultDocs[]
- `StageWorkflow` model — practiceArea, stages[{name, order, requiredChecklist}]
- APIs: full CRUD for cases, matters, court details, notes, checklists
- Workflow API: advance stage, validate checklist completion

**Frontend:**

- Case list with filters (status, practice area, lawyer, date range)
- Case detail page: overview, matters, timeline, team, documents, notes
- Kanban board view for case stages
- Matter creation wizard: select template → auto-generate tasks/folders
- Timeline component: visual display of key dates and hearings
- Checklist component: interactive checkboxes with assignment

---

### 5. Drive-like Document & File Management (DMS)

#### 5.1 Folder Architecture

- Auto folder tree: `Client → Case → Matter → Folders → Files`
- Manual folders inside any node
- Breadcrumb navigation with Drive UX
- Views: My Drive, Recent, Starred, Shared with me, Case Drive

#### 5.2 File Operations

- Upload (drag/drop), rename, move, copy, delete (permission-based)
- File preview in browser (PDF/images)
- File metadata: tags, description, linked case/matter
- Version history (upload new version, restore old)
- Bulk actions (download zip, move, share)

#### 5.3 Sharing Model (Email-based)

- Share file/folder with allowed emails + permission level:
  - **Viewer** — view/download
  - **Commenter** — comment only
  - **Editor** — upload/replace/rename/move within folder
- Share scope: file only OR folder + children (inherit permissions)
- Security: expiry date, disable download, watermark (optional)
- Revoke access instantly

#### 5.4 Access Mechanism

- Invite email → secure link
- Email verification / OTP
- Session timeout + device tracking (optional)
- Audit trail: view/download/edit/delete/share events with timestamp, user, IP

#### 5.5 Collaboration

- Threaded comments on files
- @mentions (internal users)
- "Client-visible comment" toggle

#### 5.6 Search

- Full search by filename + tags + description
- Filters: client, case, matter, file type, uploader, date range
- OCR + full-text search (optional add-on)

#### 5.7 Implementation Plan

**Backend:**

- `Folder` model — name, parent (self-ref), client, case, matter, isAutoGenerated, path
- `File` model — name, folder, mimeType, size, storagePath, tags[], description, linkedCase, linkedMatter, versions[], uploadedBy
- `FileVersion` model — file, versionNumber, storagePath, size, uploadedBy, uploadedAt
- `FileShare` model — file/folder, sharedWith (email), permission (viewer/commenter/editor), scope, expiresAt, isActive
- `FileComment` model — file, author, content, parentComment, isClientVisible
- `AuditLog` model — action, entity, entityId, user, email, ip, timestamp
- Storage: local disk (`/uploads/drive/`) with folder-based organization
- APIs:
  - Folders: CRUD, move, tree traversal
  - Files: upload (multer), download, rename, move, copy, delete, preview
  - Versions: upload new, list, restore
  - Sharing: share, update permission, revoke, list shared
  - Comments: CRUD with threading
  - Search: full-text with filters
  - Audit: log all operations

**Frontend:**

- Drive UI: folder tree sidebar + file grid/list view
- Breadcrumb navigation
- Drag-and-drop upload with progress
- File preview modal (PDF viewer, image viewer)
- Share dialog: email input, permission selector, expiry date
- Version history panel
- Comment panel with threading
- Search bar with filter dropdowns
- Bulk selection toolbar

---

### 6. Tasks, Workflow & Productivity

#### 6.1 Task Management

- Priority, due date, checklist, assignee, comments
- Recurring tasks (weekly/monthly)

#### 6.2 Automation Rules

- "When new matter created → create standard tasks + folder set"
- "If deadline in 3 days → notify assigned team"

#### 6.3 Views

- Kanban + calendar view

#### 6.4 Time Tracking

- Billable vs non-billable
- Link time entries to matter/task
- Approval flow (Partner approves timesheets)

#### 6.5 Implementation Plan

**Backend:**

- `Task` model — title, description, priority, dueDate, assignee, matter, checklist[], status, isRecurring, recurrenceRule
- `TimeEntry` model — user, matter, task, hours, description, isBillable, date, approvedBy, approvedAt
- `AutomationRule` model — trigger, conditions, actions, isActive
- Cron job: check recurring tasks, deadline reminders
- APIs: task CRUD, time entry CRUD, approval workflow, automation rules

**Frontend:**

- Task list with filters and sorting
- Kanban board (drag-and-drop status change)
- Calendar view (monthly/weekly)
- Time tracking widget: start/stop timer, manual entry
- Timesheet approval page (for Partners)
- Workload dashboard per staff member

---

### 7. Court Diary / Calendar & Scheduling

#### 7.1 Implementation Plan

**Backend:**

- `CalendarEvent` model — title, type (hearing/meeting/deadline/reminder), date, time, duration, location, participants[], linkedCase, linkedMatter, recurrence
- `HearingSchedule` model — court, time, caseNumber, assignedLawyer, notes, status
- Conflict detection: check overlapping events for same user
- Reminder system: email notifications at configurable intervals

**Frontend:**

- Firm calendar (all events) + staff calendar (personal view)
- Hearing schedule list and detail
- Add/edit event modal
- Conflict warning on scheduling
- Reminder configuration

---

### 8. Billing, Fees & Accounting

#### 8.1 Fee Structures

- Hourly, fixed, retainer, contingency, stage-based

#### 8.2 Implementation Plan

**Backend:**

- `Invoice` model — number, client, matter, items[], subtotal, tax, total, status (draft/sent/paid/overdue), dueDate, paidAmount
- `InvoiceItem` model — description, quantity, rate, amount, timeEntry reference
- `Payment` model — invoice, amount, date, method, receiptNumber, isPartial
- `Expense` model — matter, description, amount, category, receipt, isBillable
- `TrustLedger` model — client, transactions[], balance
- Invoice generation: timesheet → invoice conversion
- Payment tracking: partial payments, receipts, refunds
- Aging report calculation

**Frontend:**

- Invoice list with status filters
- Invoice builder: select time entries, add line items, apply tax
- Invoice preview and PDF generation
- Payment recording form
- Client ledger view
- Expense tracking per matter
- Aging report dashboard
- Financial reports with charts

---

### 9. Client Portal

#### 9.1 Two Access Modes

**Portal Login:**

- View assigned cases/matters
- View shared documents
- Upload requested documents
- View invoices & pay
- Secure messaging

**Drive-style Email Sharing:**

- Access only what is shared to that email
- No full portal needed for some clients

#### 9.2 Implementation Plan

**Backend:**

- Client auth: separate login flow with limited JWT scope
- Portal API routes: filtered views of cases, documents, invoices
- Secure messaging: `PortalMessage` model — client, matter, content, attachments, isRead
- Document request: `DocumentRequest` model — client, matter, description, status, uploadedFile

**Frontend:**

- Client portal layout (simplified, branded)
- Case overview page (read-only)
- Shared documents view
- Document upload for requests
- Invoice list + payment integration
- Messaging thread

---

### 10. Communication & Notifications

#### 10.1 Implementation Plan

**Backend:**

- `Notification` model — user, type, title, message, isRead, linkedEntity, createdAt
- `EmailTemplate` model — name, subject, body (with variables), type
- Email service: send via SMTP (nodemailer)
- Notification triggers: deadlines, overdue tasks, new shared docs, hearing reminders
- WebSocket support for real-time notifications (optional)

**Frontend:**

- Notification bell with unread count
- Notification dropdown/panel
- Email template management (admin)
- Notification preferences per user

---

### 11. Reporting & Analytics

#### 11.1 Report Types

| Category     | Reports                                                     |
| ------------ | ----------------------------------------------------------- |
| Case/Matter  | Open/closed, by stage, by practice area, by lawyer          |
| Productivity | Billable hours, task completion, workload distribution      |
| Financial    | Revenue by client/matter, expenses, outstanding invoices    |
| Documents    | Most accessed files, sharing logs, download history         |

#### 11.2 Implementation Plan

**Backend:**

- Aggregation pipelines for each report type
- Report API: parameterized queries with date range, filters
- Export service: generate PDF/Excel from report data

**Frontend:**

- Report dashboard with chart widgets
- Filter controls (date range, practice area, lawyer)
- Export buttons (PDF, Excel)
- Drill-down capability (click chart → detailed view)

---

### 12. Security, Compliance & Audit

#### 12.1 Requirements

- 2FA for staff (recommended)
- Strong password/session policies
- RBAC + case-level privacy
- HTTPS + encrypted storage at rest
- Backups + retention policy
- Comprehensive audit logs
- Optional: Ethical Wall (restrict staff from specific matters)

#### 12.2 Implementation Plan

**Backend:**

- 2FA: TOTP-based (speakeasy/otplib)
- Password policy: minimum length, complexity, expiry
- Session management: JWT refresh tokens, device tracking
- Audit logger middleware: log all mutations with user, IP, timestamp
- Ethical wall: `EthicalWall` model — user, matter, reason, createdBy

**Frontend:**

- 2FA setup flow (QR code + backup codes)
- Password policy enforcement on forms
- Audit log viewer (admin only)
- Active sessions management
- Ethical wall configuration (admin)

---

### 13. Admin & System Tools

#### 13.1 Implementation Plan

**Backend:**

- User management API: invite, activate, deactivate, role assign
- Master data APIs: practice areas, matter types, court lists, fee codes
- Import/export: CSV/JSON for clients, contacts, matters
- Feature toggles: `FeatureFlag` model — name, isEnabled, config

**Frontend:**

- Admin dashboard: system overview, user stats
- User management: list, invite, edit roles, deactivate
- Master data management pages
- Import/export wizards
- Feature toggle panel
- System health/status page

---

## Sprint Plan

### Sprint 4 — Admin Panel, Blog CRUD & Pagination

- Admin layout and navigation
- Blog model, CRUD API with pagination and search
- Blog management table with pagination component
- Blog create/edit forms
- Blog detail view

### Sprint 5 — RBAC, Firm Settings & Client Management

- Role and permission models
- RBAC middleware
- Admin: role management UI
- Firm settings (profile, practice areas, global config)
- Client model and CRUD API
- Client list, onboarding form, detail page

### Sprint 6 — Case/Matter Management

- Case and matter models with stages
- Court details, notes, checklists
- Matter templates and stage workflows
- Case list, detail page, Kanban view
- Timeline and checklist components

### Sprint 7 — Document Management System (DMS)

- Folder and file models
- Auto folder tree generation
- File upload, preview, version history
- Drive UI: folder tree, file grid, breadcrumbs
- Search with filters

### Sprint 8 — Sharing, Collaboration & Tasks

- File/folder sharing with permissions
- Share dialog, access management
- Threaded comments on files
- Task model and CRUD
- Kanban board, calendar view
- Time tracking

### Sprint 9 — Calendar, Billing & Invoicing

- Calendar events and hearing schedule
- Firm calendar UI
- Invoice and payment models
- Invoice builder, payment recording
- Expense tracking
- Financial reports

### Sprint 10 — Client Portal & Notifications

- Client portal auth and layout
- Portal: case view, shared docs, messaging
- Notification system (in-app + email)
- Email templates
- Communication logging

### Sprint 11 — Reporting, Security & Polish

- Report aggregation APIs
- Report dashboard with charts
- 2FA implementation
- Audit log viewer
- Import/export tools
- Feature toggles
- Final testing and polish

---

## Tech Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Frontend   | Next.js 16, React 19, Tailwind CSS 4         |
| Backend    | Express 5, TypeScript, Mongoose 8            |
| Database   | MongoDB                                      |
| Auth       | JWT (jsonwebtoken), bcryptjs, RBAC middleware |
| File Store | Local disk (`/uploads/`)                     |
| Validation | Zod (backend + frontend)                     |
| Forms      | React Hook Form + @hookform/resolvers        |
| Email      | Nodemailer (SMTP)                            |

---

## Conventions

- API prefix: `/api/v1/`
- Auth: Bearer token in Authorization header
- Response format: `{ status, success, message, data, meta? }`
- Pagination: `?page=1&size=10&search=term`
- File uploads: multer with disk storage
- Validation: Zod schemas shared between DTOs and frontend forms
- Proxy (Next.js 16): `proxy.ts` for route protection (replaces middleware.ts)
- State: AuthContext provider for client-side user state
