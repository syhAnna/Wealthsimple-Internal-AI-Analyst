// src/observability/auditLogger.ts

import { trace, context } from "@opentelemetry/api"

export interface AuditLogEntry {
  timestamp: string
  traceId: string
  userId: string
  role: string
  action: string
  query?: string
  sql?: string
  riskScore?: number
  executionTime?: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

class AuditLogger {
  private logs: AuditLogEntry[] = []
  private maxLogs = 10000

  log(entry: Omit<AuditLogEntry, "timestamp" | "traceId">): void {
    const span = trace.getActiveSpan()
    const spanContext = span?.spanContext()
    
    const auditEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      traceId: spanContext?.traceId || "unknown",
      ...entry
    }

    this.logs.push(auditEntry)

    // Prevent memory leak
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[AUDIT]", JSON.stringify(auditEntry, null, 2))
    }

    // In production, this would send to a logging service
    // e.g., Datadog, Splunk, CloudWatch, etc.
  }

  async logQueryExecution(
    userId: string,
    role: string,
    query: string,
    sql: string,
    riskScore: number,
    executionTime: number,
    success: boolean,
    error?: string
  ): Promise<void> {
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
    })
  }

  async logAccessDenied(
    userId: string,
    role: string,
    query: string,
    reason: string
  ): Promise<void> {
    this.log({
      userId,
      role,
      action: "access_denied",
      query,
      success: false,
      error: reason
    })
  }

  async logRateLimitExceeded(
    userId: string,
    endpoint: string
  ): Promise<void> {
    this.log({
      userId,
      role: "unknown",
      action: "rate_limit_exceeded",
      success: false,
      metadata: { endpoint }
    })
  }

  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit)
  }

  getLogsByUser(userId: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
  }

  clearLogs(): void {
    this.logs = []
  }
}

export const auditLogger = new AuditLogger()

// Made with Bob
