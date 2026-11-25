import {
  pgTable, uuid, text, timestamp, integer, bigint, jsonb, pgEnum, index, uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const stamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
const orgId = () => uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" });
const money = (name: string) => bigint(name, { mode: "bigint" }).notNull().default(0n);

export const roleEnum = pgEnum("role", ["owner", "admin", "manager", "member", "client"]);
export const invoiceStatus = pgEnum("invoice_status", ["draft", "sent", "partially_paid", "paid", "overdue", "void"]);
export const paymentStatus = pgEnum("payment_status", ["created", "authorized", "captured", "failed", "refunded"]);
export const leadStatus = pgEnum("lead_status", ["new", "contacted", "qualified", "proposal", "won", "lost"]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);

export const users = pgTable("users", { id: uuid("id").primaryKey(), email: text("email").notNull().unique(), fullName: text("full_name"), ...stamps });

export const organizations = pgTable("organizations", {
  id: id(), name: text("name").notNull(), slug: text("slug").notNull().unique(),
  currency: text("currency").notNull().default("INR"), logoUrl: text("logo_url"), ...stamps,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const organizationMembers = pgTable("organization_members", {
  id: id(), organizationId: orgId(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull().default("member"), clientId: uuid("client_id"),
  permissionOverrides: jsonb("permission_overrides").$type<{ grant?: string[]; revoke?: string[] }>(), ...stamps,
}, (t) => [uniqueIndex("om_org_user").on(t.organizationId, t.userId)]);

export const clients = pgTable("clients", {
  id: id(), organizationId: orgId(), name: text("name").notNull(), email: text("email"), company: text("company"),
  tags: text("tags").array().notNull().default([]), notes: text("notes"), ...stamps,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("clients_org").on(t.organizationId)]);

export const leads = pgTable("leads", {
  id: id(), organizationId: orgId(), name: text("name").notNull(), email: text("email"), source: text("source"),
  status: leadStatus("status").notNull().default("new"), valueMinor: money("value_minor"),
  convertedClientId: uuid("converted_client_id").references(() => clients.id), ...stamps,
}, (t) => [index("leads_org_status").on(t.organizationId, t.status)]);

export const projects = pgTable("projects", {
  id: id(), organizationId: orgId(), clientId: uuid("client_id").references(() => clients.id),
  name: text("name").notNull(), status: text("status").notNull().default("active"),
  budgetMinor: money("budget_minor"), deadline: timestamp("deadline", { withTimezone: true }), ...stamps,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("projects_org").on(t.organizationId)]);

export const tasks = pgTable("tasks", {
  id: id(), organizationId: orgId(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), title: text("title").notNull(), status: taskStatus("status").notNull().default("todo"),
  priority: integer("priority").notNull().default(2), position: integer("position").notNull().default(0),
  assigneeId: uuid("assignee_id").references(() => users.id), dueDate: timestamp("due_date", { withTimezone: true }), ...stamps,
}, (t) => [index("tasks_project_status").on(t.projectId, t.status)]);

export const invoices = pgTable("invoices", {
  id: id(), organizationId: orgId(), clientId: uuid("client_id").notNull().references(() => clients.id),
  number: text("number").notNull(), status: invoiceStatus("status").notNull().default("draft"),
  taxBps: integer("tax_bps").notNull().default(0), discount: jsonb("discount"),
  subtotalMinor: money("subtotal_minor"), discountMinor: money("discount_minor"), taxMinor: money("tax_minor"),
  totalMinor: money("total_minor"), paidMinor: money("paid_minor"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(), ...stamps,
}, (t) => [uniqueIndex("invoices_org_number").on(t.organizationId, t.number), index("invoices_org_status").on(t.organizationId, t.status)]);

export const invoiceItems = pgTable("invoice_items", {
  id: id(), organizationId: orgId(), invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(), qtyMilli: integer("qty_milli").notNull(), unitPriceMinor: money("unit_price_minor"),
});

export const payments = pgTable("payments", {
  id: id(), organizationId: orgId(), invoiceId: uuid("invoice_id").references(() => invoices.id),
  provider: text("provider").notNull().default("razorpay"), providerPaymentId: text("provider_payment_id"),
  providerOrderId: text("provider_order_id"), amountMinor: money("amount_minor"),
  status: paymentStatus("status").notNull().default("created"), ...stamps,
}, (t) => [uniqueIndex("payments_provider_id").on(t.provider, t.providerPaymentId)]);

export const paymentEvents = pgTable("payment_events", {
  id: id(), provider: text("provider").notNull(), providerEventId: text("provider_event_id").notNull(),
  type: text("type").notNull(), payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }), createdAt: stamps.createdAt,
}, (t) => [uniqueIndex("pe_idem").on(t.provider, t.providerEventId)]);

export const activityLogs = pgTable("activity_logs", {
  id: id(), organizationId: orgId(), actorId: uuid("actor_id"), action: text("action").notNull(),
  entity: text("entity").notNull(), entityId: uuid("entity_id"), meta: jsonb("meta"), createdAt: stamps.createdAt,
}, (t) => [index("activity_org_time").on(t.organizationId, t.createdAt)]);
