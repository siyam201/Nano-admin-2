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
}

export const storage = new DatabaseStorage();
