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
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to require specific role
 */
export declare function requireRole(requiredRole: UserRole): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to require any of the specified roles
 */
export declare function requireAnyRole(roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Check if user can access a specific table
 */
export declare function canAccessTable(user: User, tableName: string): boolean;
/**
 * Check if user has specific permission
 */
export declare function hasPermission(user: User, permission: string): boolean;
/**
 * Mock authentication middleware (replace with real auth in production)
 * In production, this would validate JWT tokens, API keys, etc.
 */
export declare function mockAuth(req: Request, res: Response, next: NextFunction): void;
/**
 * Role-based rate limiting configuration
 */
export declare function getRateLimitForRole(role: UserRole): {
    windowMs: number;
    max: number;
};
//# sourceMappingURL=rbac.d.ts.map