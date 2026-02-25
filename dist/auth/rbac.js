"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireAnyRole = requireAnyRole;
exports.canAccessTable = canAccessTable;
exports.hasPermission = hasPermission;
exports.mockAuth = mockAuth;
exports.getRateLimitForRole = getRateLimitForRole;
/**
 * Middleware to require authentication
 */
function requireAuth(req, res, next) {
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
function requireRole(requiredRole) {
    return (req, res, next) => {
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
function requireAnyRole(roles) {
    return (req, res, next) => {
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
function canAccessTable(user, tableName) {
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
function hasPermission(user, permission) {
    if (user.role === "admin") {
        return true;
    }
    return user.permissions.includes(permission);
}
/**
 * Mock authentication middleware (replace with real auth in production)
 * In production, this would validate JWT tokens, API keys, etc.
 */
function mockAuth(req, res, next) {
    // For demo purposes, extract role from header
    const roleHeader = req.headers["x-user-role"];
    const userIdHeader = req.headers["x-user-id"];
    const emailHeader = req.headers["x-user-email"];
    if (!roleHeader || !userIdHeader) {
        // Default to analyst for demo
        req.user = {
            id: "demo-user",
            role: "analyst",
            email: "demo@example.com",
            permissions: ["query:read", "schema:read"],
        };
    }
    else {
        const role = roleHeader;
        // Set permissions based on role
        let permissions = [];
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
function getRateLimitForRole(role) {
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
// Made with Bob
//# sourceMappingURL=rbac.js.map