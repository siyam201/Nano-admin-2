import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "./auth";
import { storage } from "./storage";
import type { User, ApiKey } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: TokenPayload;
      apiKey?: ApiKey;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization required" });
  }

  const token = authHeader.substring(7);
  
  // Check if it's an API key
  if (token.startsWith("nano_")) {
    const apiKey = await storage.getApiKeyByKey(token);
    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({ message: "Invalid or disabled API key" });
    }
    
    // Update last used time
    await storage.updateApiKey(apiKey.id, { lastUsedAt: new Date() });
    
    const user = await storage.getUser(apiKey.userId);
    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "User not found or inactive" });
    }
    
    req.user = user;
    return next();
  }

  // JWT token
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: "Account not active" });
  }

  req.user = user;
  req.tokenPayload = payload;
  next();
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers["x-api-key"] as string;
  
  if (!apiKeyHeader) {
    return res.status(401).json({ message: "API key required. Provide X-API-Key header." });
  }

  const apiKey = await storage.getApiKeyByKey(apiKeyHeader);
  if (!apiKey || !apiKey.isActive) {
    return res.status(401).json({ message: "Invalid or disabled API key" });
  }

  await storage.updateApiKey(apiKey.id, { lastUsedAt: new Date() });

  const user = await storage.getUser(apiKey.userId);
  if (!user || user.status !== "active") {
    return res.status(401).json({ message: "API key owner not found or inactive" });
  }

  req.apiKey = apiKey;
  req.user = user;
  next();
}
