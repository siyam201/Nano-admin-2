import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"), // 'admin' or 'user'
  status: text("status").notNull().default("pending"), // 'pending', 'active', 'blocked'
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
  apiKeys: many(apiKeys),
  refreshTokens: many(refreshTokens),
}));

// Verification codes for email verification
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  apiKeyId: varchar("api_key_id", { length: 36 }),
  apiKeyName: text("api_key_name"),
  autoApprove: boolean("auto_approve").notNull().default(false),
});

// Refresh tokens for JWT
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// Activity logs
export const activities = pgTable("activities", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  action: text("action").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

// API Keys
export const apiKeys = pgTable("api_keys", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // 'active', 'disabled', 'archived'
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  databases: many(databases),
  projectUsers: many(projectUsers),
}));

// Project Users (Many-to-Many)
export const projectUsers = pgTable("project_users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  role: text("role").notNull().default("developer"), // 'admin', 'developer', 'viewer'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectUsersRelations = relations(projectUsers, ({ one }) => ({
  project: one(projects, {
    fields: [projectUsers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUsers.userId],
    references: [users.id],
  }),
}));

// Databases table
export const databases = pgTable("databases", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  type: text("type").notNull(), // 'postgresql', 'mysql', 'mongodb'
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  databaseName: text("database_name").notNull(),
  isolationType: text("isolation_type").notNull().default("dedicated"), // 'dedicated', 'shared'
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'deleted'
  backupEnabled: boolean("backup_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const databasesRelations = relations(databases, ({ one, many }) => ({
  project: one(projects, {
    fields: [databases.projectId],
    references: [projects.id],
  }),
  credentials: many(databaseCredentials),
}));

// Database Credentials (Temporary access)
export const databaseCredentials = pgTable("database_credentials", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  databaseId: varchar("database_id", { length: 36 }).notNull().references(() => databases.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  tempUsername: text("temp_username").notNull(),
  tempPassword: text("temp_password").notNull(),
  ipRestriction: text("ip_restriction"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const databaseCredentialsRelations = relations(databaseCredentials, ({ one }) => ({
  database: one(databases, {
    fields: [databaseCredentials.databaseId],
    references: [databases.id],
  }),
  user: one(users, {
    fields: [databaseCredentials.userId],
    references: [users.id],
  }),
}));

// API Vault - Store encrypted API keys/secrets
export const apiVault = pgTable("api_vault", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  serviceName: text("service_name").notNull(), // 'firebase', 'google', 'stripe', etc.
  keyName: text("key_name").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  scope: text("scope"), // 'public', 'private'
  rateLimit: integer("rate_limit"), // requests per minute
  status: text("status").notNull().default("active"), // 'active', 'revoked'
  lastRotatedAt: timestamp("last_rotated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiVaultRelations = relations(apiVault, ({ one }) => ({
  project: one(projects, {
    fields: [apiVault.projectId],
    references: [projects.id],
  }),
}));

// External Signup API Keys
export const externalSignupKeys = pgTable("external_signup_keys", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  apiKey: text("api_key").notNull().unique(),
  name: text("name").notNull(), // 'partner_site', 'mobile_app', etc.
  rateLimit: integer("rate_limit").notNull().default(100), // requests per minute
  isActive: boolean("is_active").notNull().default(true),
  ipWhitelist: text("ip_whitelist"), // comma-separated IPs
  originWhitelist: text("origin_whitelist"), // comma-separated origins
  autoApproveSignup: boolean("auto_approve_signup").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export const externalSignupKeysRelations = relations(externalSignupKeys, ({ one }) => ({
  project: one(projects, {
    fields: [externalSignupKeys.projectId],
    references: [projects.id],
  }),
}));

// Email Configuration
export const emailConfigs = pgTable("email_configs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  provider: text("provider").notNull(), // 'gmail', 'sendgrid', 'mailgun', 'smtp'
  encryptedConfig: text("encrypted_config").notNull(), // encrypted JSON config
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const emailConfigsRelations = relations(emailConfigs, ({ one }) => ({
  project: one(projects, {
    fields: [emailConfigs.projectId],
    references: [projects.id],
  }),
}));

// Audit Logs - Immutable log of all actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'login', etc.
  resource: text("resource").notNull(), // 'user', 'project', 'database', etc.
  resourceId: varchar("resource_id", { length: 36 }),
  details: jsonb("details"), // full details of action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source").notNull().default("website"), // 'website', 'api'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [auditLogs.projectId],
    references: [projects.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
  isDeleted: true,
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
  used: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

// Auth schemas for validation
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

// Insert schemas for new tables
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectUsersSchema = createInsertSchema(projectUsers).omit({
  id: true,
  createdAt: true,
});

export const insertDatabaseSchema = createInsertSchema(databases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDatabaseCredentialsSchema = createInsertSchema(databaseCredentials).omit({
  id: true,
  createdAt: true,
});

export const insertApiVaultSchema = createInsertSchema(apiVault).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRotatedAt: true,
});

export const insertExternalSignupKeySchema = createInsertSchema(externalSignupKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertEmailConfigSchema = createInsertSchema(emailConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectUser = typeof projectUsers.$inferSelect;
export type InsertProjectUser = z.infer<typeof insertProjectUsersSchema>;
export type Database = typeof databases.$inferSelect;
export type InsertDatabase = z.infer<typeof insertDatabaseSchema>;
export type DatabaseCredential = typeof databaseCredentials.$inferSelect;
export type InsertDatabaseCredential = z.infer<typeof insertDatabaseCredentialsSchema>;
export type ApiVaultEntry = typeof apiVault.$inferSelect;
export type InsertApiVaultEntry = z.infer<typeof insertApiVaultSchema>;
export type ExternalSignupKey = typeof externalSignupKeys.$inferSelect;
export type InsertExternalSignupKey = z.infer<typeof insertExternalSignupKeySchema>;
export type EmailConfig = typeof emailConfigs.$inferSelect;
export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
