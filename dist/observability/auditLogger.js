"use strict";
// src/observability/auditLogger.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = void 0;
const api_1 = require("@opentelemetry/api");
class AuditLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 10000;
    }
    log(entry) {
        const span = api_1.trace.getActiveSpan();
        const spanContext = span?.spanContext();
        const auditEntry = {
            timestamp: new Date().toISOString(),
            traceId: spanContext?.traceId || "unknown",
            ...entry
        };
        this.logs.push(auditEntry);
        // Prevent memory leak
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        // Log to console in development
        if (process.env.NODE_ENV !== "production") {
            console.log("[AUDIT]", JSON.stringify(auditEntry, null, 2));
        }
        // In production, this would send to a logging service
        // e.g., Datadog, Splunk, CloudWatch, etc.
    }
    async logQueryExecution(userId, role, query, sql, riskScore, executionTime, success, error) {
        this.log({
            userId,
            role,
            action: "query_execution",
            query,
            sql,
            riskScore,
            executionTime,
            success,
            error
        });
    }
    async logAccessDenied(userId, role, query, reason) {
        this.log({
            userId,
            role,
            action: "access_denied",
            query,
            success: false,
            error: reason
        });
    }
    async logRateLimitExceeded(userId, endpoint) {
        this.log({
            userId,
            role: "unknown",
            action: "rate_limit_exceeded",
            success: false,
            metadata: { endpoint }
        });
    }
    getRecentLogs(limit = 100) {
        return this.logs.slice(-limit);
    }
    getLogsByUser(userId, limit = 100) {
        return this.logs
            .filter(log => log.userId === userId)
            .slice(-limit);
    }
    clearLogs() {
        this.logs = [];
    }
}
exports.auditLogger = new AuditLogger();
// Made with Bob
//# sourceMappingURL=auditLogger.js.map