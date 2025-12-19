import {
  users,
  verificationCodes,
  refreshTokens,
  activities,
  apiKeys,
  projects,
  projectUsers,
  databases,
  databaseCredentials,
  apiVault,
  externalSignupKeys,
  emailConfigs,
  auditLogs,
  type User,
  type InsertUser,
  type VerificationCode,
  type InsertVerificationCode,
  type RefreshToken,
  type InsertRefreshToken,
  type Activity,
  type InsertActivity,
  type ApiKey,
  type InsertApiKey,
  type Project,
  type InsertProject,
  type ProjectUser,
  type InsertProjectUser,
  type Database,
  type InsertDatabase,
  type DatabaseCredential,
  type InsertDatabaseCredential,
  type ApiVaultEntry,
  type InsertApiVaultEntry,
  type ExternalSignupKey,
  type InsertExternalSignupKey,
  type EmailConfig,
  type InsertEmailConfig,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, or, sql, gte, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsers(options: { page: number; limit: number; search?: string; status?: string }): Promise<{ users: User[]; total: number }>;
  countUsers(): Promise<number>;
  countActiveUsers(): Promise<number>;
  countNewUsersToday(): Promise<number>;
  countPendingUsers(): Promise<number>;

  // Verification codes
  createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode>;
  getVerificationCode(email: string, code: string): Promise<VerificationCode | undefined>;
  markVerificationCodeUsed(id: string): Promise<void>;

  // Refresh tokens
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteUserRefreshTokens(userId: string): Promise<void>;

  // Activities
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivities(options: { page: number; limit: number; search?: string; action?: string }): Promise<{ activities: (Activity & { user?: User | null })[]; total: number }>;
  getRecentActivities(limit: number): Promise<(Activity & { user?: User | null })[]>;

  // API Keys
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeys(userId: string): Promise<ApiKey[]>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;

  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjects(ownerId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Project Users
  addUserToProject(projectUser: InsertProjectUser): Promise<ProjectUser>;
  getProjectUsers(projectId: string): Promise<ProjectUser[]>;
  removeUserFromProject(projectId: string, userId: string): Promise<boolean>;

  // Databases
  createDatabase(database: InsertDatabase): Promise<Database>;
  getDatabase(id: string): Promise<Database | undefined>;
  getDatabasesByProject(projectId: string): Promise<Database[]>;
  updateDatabase(id: string, updates: Partial<Database>): Promise<Database | undefined>;
  deleteDatabase(id: string): Promise<boolean>;

  // Database Credentials
  createDatabaseCredential(credential: InsertDatabaseCredential): Promise<DatabaseCredential>;
  getDatabaseCredentials(databaseId: string): Promise<DatabaseCredential[]>;
  getUserDatabaseCredential(databaseId: string, userId: string): Promise<DatabaseCredential | undefined>;
  deleteDatabaseCredential(id: string): Promise<boolean>;

  // API Vault
  createApiVaultEntry(entry: InsertApiVaultEntry): Promise<ApiVaultEntry>;
  getApiVaultEntry(id: string): Promise<ApiVaultEntry | undefined>;
  getProjectApiVault(projectId: string): Promise<ApiVaultEntry[]>;
  updateApiVaultEntry(id: string, updates: Partial<ApiVaultEntry>): Promise<ApiVaultEntry | undefined>;
  deleteApiVaultEntry(id: string): Promise<boolean>;

  // External Signup Keys
  createExternalSignupKey(key: InsertExternalSignupKey): Promise<ExternalSignupKey>;
  getExternalSignupKey(apiKey: string): Promise<ExternalSignupKey | undefined>;
  getProjectSignupKeys(projectId: string): Promise<ExternalSignupKey[]>;
  updateExternalSignupKey(id: string, updates: Partial<ExternalSignupKey>): Promise<ExternalSignupKey | undefined>;

  // Email Configs
  createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig>;
  getEmailConfig(projectId: string): Promise<EmailConfig | undefined>;
  updateEmailConfig(id: string, updates: Partial<EmailConfig>): Promise<EmailConfig | undefined>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(options: { projectId?: string; limit: number; offset: number }): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isDeleted, false)));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.isDeleted, false)));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const [user] = await db.update(users).set({ isDeleted: true }).where(eq(users.id, id)).returning();
    return !!user;
  }

  async getUsers(options: { page: number; limit: number; search?: string; status?: string }): Promise<{ users: User[]; total: number }> {
    const { page, limit, search, status } = options;
    const offset = (page - 1) * limit;

    let conditions = [eq(users.isDeleted, false)];
    
    if (search) {
      conditions.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`)) as any);
    }
    
    if (status) {
      conditions.push(eq(users.status, status));
    }

    const whereClause = and(...conditions);

    const [result, countResult] = await Promise.all([
      db.select().from(users).where(whereClause).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause),
    ]);

    return {
      users: result,
      total: Number(countResult[0]?.count || 0),
    };
  }

  async countUsers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isDeleted, false));
    return Number(result?.count || 0);
  }

  async countActiveUsers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.isDeleted, false), eq(users.status, "active")));
    return Number(result?.count || 0);
  }

  async countNewUsersToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.isDeleted, false), gte(users.createdAt, today), lt(users.createdAt, tomorrow)));
    return Number(result?.count || 0);
  }

  async countPendingUsers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.isDeleted, false), eq(users.status, "pending")));
    return Number(result?.count || 0);
  }

  // Verification codes
  async createVerificationCode(code: InsertVerificationCode): Promise<VerificationCode> {
    const [result] = await db.insert(verificationCodes).values(code).returning();
    return result;
  }

  async getVerificationCode(email: string, code: string): Promise<VerificationCode | undefined> {
    const [result] = await db
      .select()
      .from(verificationCodes)
      .where(and(eq(verificationCodes.email, email), eq(verificationCodes.code, code), eq(verificationCodes.used, false)));
    return result || undefined;
  }

  async markVerificationCodeUsed(id: string): Promise<void> {
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, id));
  }

  // Refresh tokens
  async createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const [result] = await db.insert(refreshTokens).values(token).returning();
    return result;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [result] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return result || undefined;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  // Activities
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [result] = await db.insert(activities).values(activity).returning();
    return result;
  }

  async getActivities(options: { page: number; limit: number; search?: string; action?: string }): Promise<{ activities: (Activity & { user?: User | null })[]; total: number }> {
    const { page, limit, search, action } = options;
    const offset = (page - 1) * limit;

    let conditions: any[] = [];
    
    if (search) {
      conditions.push(or(like(activities.action, `%${search}%`), like(activities.details, `%${search}%`)));
    }
    
    if (action) {
      conditions.push(like(activities.action, `%${action}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result, countResult] = await Promise.all([
      db
        .select()
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(activities).where(whereClause),
    ]);

    return {
      activities: result.map((r) => ({
        ...r.activities,
        user: r.users,
      })),
      total: Number(countResult[0]?.count || 0),
    };
  }

  async getRecentActivities(limit: number): Promise<(Activity & { user?: User | null })[]> {
    const result = await db
      .select()
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return result.map((r) => ({
      ...r.activities,
      user: r.users,
    }));
  }

  // API Keys
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values(apiKey).returning();
    return result;
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [result] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return result || undefined;
  }

  async updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const [result] = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).returning();
    return result || undefined;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return true;
  }

  // Projects
  async createProject(project: InsertProject): Promise<Project> {
    const [result] = await db.insert(projects).values(project).returning();
    return result;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [result] = await db.select().from(projects).where(eq(projects.id, id));
    return result || undefined;
  }

  async getProjects(ownerId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.createdAt));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [result] = await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return result || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return !!result;
  }

  // Project Users
  async addUserToProject(projectUser: InsertProjectUser): Promise<ProjectUser> {
    const [result] = await db.insert(projectUsers).values(projectUser).returning();
    return result;
  }

  async getProjectUsers(projectId: string): Promise<ProjectUser[]> {
    return db.select().from(projectUsers).where(eq(projectUsers.projectId, projectId));
  }

  async removeUserFromProject(projectId: string, userId: string): Promise<boolean> {
    const result = await db.delete(projectUsers).where(and(eq(projectUsers.projectId, projectId), eq(projectUsers.userId, userId)));
    return !!result;
  }

  // Databases
  async createDatabase(database: InsertDatabase): Promise<Database> {
    const [result] = await db.insert(databases).values(database).returning();
    return result;
  }

  async getDatabase(id: string): Promise<Database | undefined> {
    const [result] = await db.select().from(databases).where(eq(databases.id, id));
    return result || undefined;
  }

  async getDatabasesByProject(projectId: string): Promise<Database[]> {
    return db.select().from(databases).where(eq(databases.projectId, projectId)).orderBy(desc(databases.createdAt));
  }

  async updateDatabase(id: string, updates: Partial<Database>): Promise<Database | undefined> {
    const [result] = await db.update(databases).set({ ...updates, updatedAt: new Date() }).where(eq(databases.id, id)).returning();
    return result || undefined;
  }

  async deleteDatabase(id: string): Promise<boolean> {
    const result = await db.delete(databases).where(eq(databases.id, id));
    return !!result;
  }

  // Database Credentials
  async createDatabaseCredential(credential: InsertDatabaseCredential): Promise<DatabaseCredential> {
    const [result] = await db.insert(databaseCredentials).values(credential).returning();
    return result;
  }

  async getDatabaseCredentials(databaseId: string): Promise<DatabaseCredential[]> {
    return db.select().from(databaseCredentials).where(eq(databaseCredentials.databaseId, databaseId));
  }

  async getUserDatabaseCredential(databaseId: string, userId: string): Promise<DatabaseCredential | undefined> {
    const [result] = await db.select().from(databaseCredentials).where(and(eq(databaseCredentials.databaseId, databaseId), eq(databaseCredentials.userId, userId), eq(databaseCredentials.isActive, true)));
    return result || undefined;
  }

  async deleteDatabaseCredential(id: string): Promise<boolean> {
    const result = await db.delete(databaseCredentials).where(eq(databaseCredentials.id, id));
    return !!result;
  }

  // API Vault
  async createApiVaultEntry(entry: InsertApiVaultEntry): Promise<ApiVaultEntry> {
    const [result] = await db.insert(apiVault).values(entry).returning();
    return result;
  }

  async getApiVaultEntry(id: string): Promise<ApiVaultEntry | undefined> {
    const [result] = await db.select().from(apiVault).where(eq(apiVault.id, id));
    return result || undefined;
  }

  async getProjectApiVault(projectId: string): Promise<ApiVaultEntry[]> {
    return db.select().from(apiVault).where(eq(apiVault.projectId, projectId)).orderBy(desc(apiVault.createdAt));
  }

  async updateApiVaultEntry(id: string, updates: Partial<ApiVaultEntry>): Promise<ApiVaultEntry | undefined> {
    const [result] = await db.update(apiVault).set({ ...updates, updatedAt: new Date() }).where(eq(apiVault.id, id)).returning();
    return result || undefined;
  }

  async deleteApiVaultEntry(id: string): Promise<boolean> {
    const result = await db.delete(apiVault).where(eq(apiVault.id, id));
    return !!result;
  }

  // External Signup Keys
  async createExternalSignupKey(key: InsertExternalSignupKey): Promise<ExternalSignupKey> {
    const [result] = await db.insert(externalSignupKeys).values(key).returning();
    return result;
  }

  async getExternalSignupKey(apiKey: string): Promise<ExternalSignupKey | undefined> {
    const [result] = await db.select().from(externalSignupKeys).where(eq(externalSignupKeys.apiKey, apiKey));
    return result || undefined;
  }

  async getProjectSignupKeys(projectId: string): Promise<ExternalSignupKey[]> {
    return db.select().from(externalSignupKeys).where(eq(externalSignupKeys.projectId, projectId));
  }

  async updateExternalSignupKey(id: string, updates: Partial<ExternalSignupKey>): Promise<ExternalSignupKey | undefined> {
    const [result] = await db.update(externalSignupKeys).set(updates).where(eq(externalSignupKeys.id, id)).returning();
    return result || undefined;
  }

  // Email Configs
  async createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig> {
    const [result] = await db.insert(emailConfigs).values(config).returning();
    return result;
  }

  async getEmailConfig(projectId: string): Promise<EmailConfig | undefined> {
    const [result] = await db.select().from(emailConfigs).where(eq(emailConfigs.projectId, projectId));
    return result || undefined;
  }

  async updateEmailConfig(id: string, updates: Partial<EmailConfig>): Promise<EmailConfig | undefined> {
    const [result] = await db.update(emailConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(emailConfigs.id, id)).returning();
    return result || undefined;
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log).returning();
    return result;
  }

  async getAuditLogs(options: { projectId?: string; limit: number; offset: number }): Promise<AuditLog[]> {
    const { projectId, limit, offset } = options;
    let conditions: any[] = [];
    
    if (projectId) {
      conditions.push(eq(auditLogs.projectId, projectId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  }
}

export const storage = new DatabaseStorage();
