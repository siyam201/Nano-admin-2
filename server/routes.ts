import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashPassword,
  comparePassword,
  generateVerificationCode,
  generateApiKey,
  getVerificationCodeExpiry,
} from "./auth";
import { authMiddleware, adminOnly, getClientIp, apiKeyMiddleware } from "./middleware";
import { sendVerificationEmail, sendApprovalEmail } from "./email";
import { registerSchema, loginSchema, verifyCodeSchema, changePasswordSchema, createApiKeySchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth routes - Website: Login Only (NO signup on website)
  // External Signup: Only via API with API key

  // Admin-only: Create user endpoint
  app.post("/api/admin/users/create", authMiddleware, adminOnly, async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password, name } = parsed.data;
      const userCount = await storage.countUsers();
      const isFirstUser = userCount === 0;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role: isFirstUser ? "admin" : "user",
        status: "active",
      });

      await storage.createAuditLog({
        userId: req.user!.id,
        action: "create",
        resource: "user",
        resourceId: user.id,
        details: { email, name },
        ipAddress: getClientIp(req),
        source: "website",
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // External API: Signup endpoint (no website signup)
  app.post("/api/public/signup", async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) {
        return res.status(401).json({ message: "API key required" });
      }

      const signupKey = await storage.getExternalSignupKey(apiKey);
      if (!signupKey || !signupKey.isActive) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password, name } = parsed.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role: "user",
        status: signupKey.autoApproveSignup ? "active" : "pending",
      });

      const code = generateVerificationCode();
      await storage.createVerificationCode({
        email,
        code,
        expiresAt: getVerificationCodeExpiry(),
        apiKeyId: signupKey.id,
        apiKeyName: signupKey.name,
        autoApprove: signupKey.autoApproveSignup,
      });

      await sendVerificationEmail(email, code);

      await storage.updateExternalSignupKey(signupKey.id, { lastUsedAt: new Date() });

      await storage.createAuditLog({
        userId: user.id,
        projectId: signupKey.projectId,
        action: "create",
        resource: "user",
        resourceId: user.id,
        details: { source: signupKey.name },
        ipAddress: getClientIp(req),
        source: "api",
      });

      res.status(201).json({ message: "Verification code sent to email" });
    } catch (error) {
      console.error("External signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const parsed = verifyCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, code } = parsed.data;

      const verificationCode = await storage.getVerificationCode(email, code);
      if (!verificationCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date() > verificationCode.expiresAt) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      // Mark code as used
      await storage.markVerificationCodeUsed(verificationCode.id);

      // User is now verified but pending admin approval
      const user = await storage.getUserByEmail(email);
      if (user) {
        await storage.createActivity({
          userId: user.id,
          action: "Email verified",
          details: "Pending admin approval",
          ipAddress: getClientIp(req),
        });
      }

      res.json({ message: "Email verified. Waiting for admin approval." });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-code", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const code = generateVerificationCode();
      await storage.createVerificationCode({
        email,
        code,
        expiresAt: getVerificationCodeExpiry(),
      });

      const emailSent = await sendVerificationEmail(email, code);
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      res.json({ message: "Verification code sent" });
    } catch (error) {
      console.error("Resend code error:", error);
      res.status(500).json({ message: "Failed to resend code" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status === "pending") {
        return res.status(403).json({ message: "Account pending approval" });
      }

      if (user.status === "blocked") {
        return res.status(403).json({ message: "Account has been blocked" });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token
      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "User logged in",
        ipAddress: getClientIp(req),
      });

      // Set refresh token as HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        accessToken,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      if (new Date() > storedToken.expiresAt) {
        await storage.deleteRefreshToken(refreshToken);
        return res.status(401).json({ message: "Refresh token expired" });
      }

      const user = await storage.getUser(storedToken.userId);
      if (!user || user.status !== "active") {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        accessToken,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Refresh error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await storage.deleteRefreshToken(refreshToken);
      }

      res.clearCookie("refreshToken");
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
    try {
      const { name, email } = req.body;
      const userId = req.user!.id;

      const updates: any = {};
      if (name) updates.name = name;
      if (email && email !== req.user!.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updates.email = email;
      }

      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.createActivity({
        userId,
        action: "Profile updated",
        ipAddress: getClientIp(req),
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Profile update failed" });
    }
  });

  app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { currentPassword, newPassword } = parsed.data;
      const user = req.user!;

      const isPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });

      // Invalidate all refresh tokens
      await storage.deleteUserRefreshTokens(user.id);

      await storage.createActivity({
        userId: user.id,
        action: "Password changed",
        ipAddress: getClientIp(req),
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
    try {
      const [totalUsers, activeUsers, newUsersToday, pendingApprovals] = await Promise.all([
        storage.countUsers(),
        storage.countActiveUsers(),
        storage.countNewUsersToday(),
        storage.countPendingUsers(),
      ]);

      res.json({
        totalUsers,
        activeUsers,
        newUsersToday,
        pendingApprovals,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // User routes
  app.get("/api/users", authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await storage.getUsers({ page, limit, search, status });

      // Remove passwords from response
      const users = result.users.map(({ password, ...user }) => user);

      res.json({
        users,
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, status } = req.body;

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (role) updates.role = role;
      if (status) updates.status = status;

      const oldStatus = user.status;
      const updatedUser = await storage.updateUser(id, updates);

      // Send approval email if status changed to active
      if (oldStatus !== "active" && status === "active") {
        await sendApprovalEmail(user.email, user.name);
      }

      await storage.createActivity({
        userId: req.user!.id,
        action: `User ${user.email} updated`,
        details: `Changes: ${JSON.stringify(updates)}`,
        ipAddress: getClientIp(req),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(id);

      await storage.createActivity({
        userId: req.user!.id,
        action: `User ${user.email} deleted`,
        ipAddress: getClientIp(req),
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Activity routes
  app.get("/api/activities", authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const action = req.query.action as string;

      const result = await storage.getActivities({ page, limit, search, action });

      // Remove passwords from user data
      const activities = result.activities.map((activity) => ({
        ...activity,
        user: activity.user ? { ...activity.user, password: undefined } : null,
      }));

      res.json({
        activities,
        total: result.total,
        page,
        limit,
      });
    } catch (error) {
      console.error("Get activities error:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/recent", authMiddleware, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(limit);

      // Remove passwords from user data
      const result = activities.map((activity) => ({
        ...activity,
        user: activity.user ? { ...activity.user, password: undefined } : null,
      }));

      res.json(result);
    } catch (error) {
      console.error("Get recent activities error:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // API Key routes
  app.get("/api/api-keys", authMiddleware, async (req, res) => {
    try {
      const apiKeys = await storage.getApiKeys(req.user!.id);
      res.json(apiKeys);
    } catch (error) {
      console.error("Get API keys error:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", authMiddleware, async (req, res) => {
    try {
      const parsed = createApiKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { name } = parsed.data;
      const key = generateApiKey();

      const apiKey = await storage.createApiKey({
        userId: req.user!.id,
        name,
        key,
        isActive: true,
      });

      await storage.createActivity({
        userId: req.user!.id,
        action: "API key created",
        details: `Key name: ${name}`,
        ipAddress: getClientIp(req),
      });

      res.json(apiKey);
    } catch (error) {
      console.error("Create API key error:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.patch("/api/api-keys/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const updatedKey = await storage.updateApiKey(id, { isActive });
      if (!updatedKey) {
        return res.status(404).json({ message: "API key not found" });
      }

      await storage.createActivity({
        userId: req.user!.id,
        action: `API key ${isActive ? "enabled" : "disabled"}`,
        details: `Key: ${updatedKey.name}`,
        ipAddress: getClientIp(req),
      });

      res.json(updatedKey);
    } catch (error) {
      console.error("Update API key error:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.delete("/api/api-keys/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;

      await storage.deleteApiKey(id);

      await storage.createActivity({
        userId: req.user!.id,
        action: "API key deleted",
        ipAddress: getClientIp(req),
      });

      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Delete API key error:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // =========================================
  // External API Routes (API Key authenticated)
  // =========================================

  // External registration - auto-approves after email verification
  app.post("/api/external/register", apiKeyMiddleware, async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password, name } = parsed.data;
      const apiKey = req.apiKey!;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password and create user (pending status until verified)
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role: "user",
        status: "pending",
      });

      // Generate and send verification code with API key info
      const code = generateVerificationCode();
      await storage.createVerificationCode({
        email,
        code,
        expiresAt: getVerificationCodeExpiry(),
        apiKeyId: apiKey.id,
        apiKeyName: apiKey.name,
        autoApprove: true,
      });

      const emailSent = await sendVerificationEmail(email, code, apiKey.name);
      if (!emailSent) {
        console.warn("Failed to send verification email");
      }

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "User registered via API",
        details: `App: ${apiKey.name}`,
        ipAddress: getClientIp(req),
      });

      res.json({
        message: "Verification code sent to your email",
        appName: apiKey.name,
      });
    } catch (error) {
      console.error("External registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // External verification - auto-approves user
  app.post("/api/external/verify", apiKeyMiddleware, async (req, res) => {
    try {
      const parsed = verifyCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, code } = parsed.data;

      const verificationCode = await storage.getVerificationCode(email, code);
      if (!verificationCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (new Date() > verificationCode.expiresAt) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      // Mark code as used
      await storage.markVerificationCodeUsed(verificationCode.id);

      // Get user and auto-approve if registered via API
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Auto-approve user since this is API-based verification
      await storage.updateUser(user.id, { status: "active" });

      // Log activity
      await storage.createActivity({
        userId: user.id,
        action: "Email verified and auto-approved",
        details: `App: ${req.apiKey!.name}`,
        ipAddress: getClientIp(req),
      });

      // Generate tokens for immediate login
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: "Email verified and account approved",
        accessToken,
        refreshToken,
        user: { ...userWithoutPassword, status: "active" },
      });
    } catch (error) {
      console.error("External verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // External login
  app.post("/api/external/login", apiKeyMiddleware, async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status === "pending") {
        return res.status(403).json({ message: "Please verify your email first" });
      }

      if (user.status === "blocked") {
        return res.status(403).json({ message: "Account has been blocked" });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      await storage.createActivity({
        userId: user.id,
        action: "User logged in via API",
        details: `App: ${req.apiKey!.name}`,
        ipAddress: getClientIp(req),
      });

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("External login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  return httpServer;
}
