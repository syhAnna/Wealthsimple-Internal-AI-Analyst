import { Request, Response, NextFunction } from "express";

/**
 * Role-Based Access Control (RBAC)
 * 
 * Enforces:
 * - Who can query what tables
 * - Who can access PII
 * - Who can run high-cost queries
 * 
 * Critical for fintech compliance (SOC2, GDPR, etc.)
 */

export type UserRole = "viewer" | "analyst" | "admin" | "compliance";

export interface User {
  id: string;
  role: UserRole;
  email: string;
  permissions: string[];
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
    return;
  }

  next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(requiredRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    if (user.role !== requiredRole && user.role !== "admin") {
      res.status(403).json({
        error: "Forbidden",
        message: `This endpoint requires ${requiredRole} role`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require any of the specified roles
 */
export function requireAnyRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    if (!roles.includes(user.role) && user.role !== "admin") {
      res.status(403).json({
        error: "Forbidden",
        message: `This endpoint requires one of: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Check if user can access a specific table
 */
export function canAccessTable(user: User, tableName: string): boolean {
  // Define sensitive tables
  const piiTables = ["user_pii", "customer_data", "payment_info", "ssn_records"];
  const complianceTables = ["audit_logs", "compliance_reports", "risk_assessments"];

  // Admin can access everything
  if (user.role === "admin") {
    return true;
  }

  // Only compliance role can access PII tables
  if (piiTables.includes(tableName.toLowerCase())) {
    return user.role === "compliance";
  }

  // Only compliance and admin can access compliance tables
  if (complianceTables.includes(tableName.toLowerCase())) {
    return user.role === "compliance";
  }

  // Viewers, analysts can access non-sensitive tables
  return true;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User, permission: string): boolean {
  if (user.role === "admin") {
    return true;
  }

  return user.permissions.includes(permission);
}

/**
 * Mock authentication middleware (replace with real auth in production)
 * In production, this would validate JWT tokens, API keys, etc.
 */
export function mockAuth(req: Request, res: Response, next: NextFunction): void {
  // For demo purposes, extract role from header
  const roleHeader = req.headers["x-user-role"] as string;
  const userIdHeader = req.headers["x-user-id"] as string;
  const emailHeader = req.headers["x-user-email"] as string;

  if (!roleHeader || !userIdHeader) {
    // Default to analyst for demo
    req.user = {
      id: "demo-user",
      role: "analyst",
      email: "demo@example.com",
      permissions: ["query:read", "schema:read"],
    };
  } else {
    const role = roleHeader as UserRole;
    
    // Set permissions based on role
    let permissions: string[] = [];
    switch (role) {
      case "admin":
        permissions = ["*"];
        break;
      case "compliance":
        permissions = ["query:read", "query:write", "pii:read", "audit:read"];
        break;
      case "analyst":
        permissions = ["query:read", "schema:read"];
        break;
    }

    req.user = {
      id: userIdHeader,
      role,
      email: emailHeader || `${userIdHeader}@example.com`,
      permissions,
    };
  }

  next();
}

/**
 * Role-based rate limiting configuration
 */
export function getRateLimitForRole(role: UserRole): { windowMs: number; max: number } {
  switch (role) {
    case "admin":
      return { windowMs: 60000, max: 1000 }; // 1000 requests per minute
    case "compliance":
      return { windowMs: 60000, max: 500 }; // 500 requests per minute
    case "analyst":
      return { windowMs: 60000, max: 100 }; // 100 requests per minute
    default:
      return { windowMs: 60000, max: 50 }; // 50 requests per minute for unknown
  }
}
