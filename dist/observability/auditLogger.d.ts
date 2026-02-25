export interface AuditLogEntry {
    timestamp: string;
    traceId: string;
    userId: string;
    role: string;
    action: string;
    query?: string;
    sql?: string;
    riskScore?: number;
    executionTime?: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}
declare class AuditLogger {
    private logs;
    private maxLogs;
    log(entry: Omit<AuditLogEntry, "timestamp" | "traceId">): void;
    logQueryExecution(userId: string, role: string, query: string, sql: string, riskScore: number, executionTime: number, success: boolean, error?: string): Promise<void>;
    logAccessDenied(userId: string, role: string, query: string, reason: string): Promise<void>;
    logRateLimitExceeded(userId: string, endpoint: string): Promise<void>;
    getRecentLogs(limit?: number): AuditLogEntry[];
    getLogsByUser(userId: string, limit?: number): AuditLogEntry[];
    clearLogs(): void;
}
export declare const auditLogger: AuditLogger;
export {};
//# sourceMappingURL=auditLogger.d.ts.map