"use strict";
// Governance Engine - Risk assessment and compliance validation
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateGovernance = evaluateGovernance;
exports.createAuditLog = createAuditLog;
/**
 * Evaluate query for governance compliance and risk
 * This is the critical control layer between AI and data
 */
function evaluateGovernance(intent, sql, schema) {
    const riskFlags = [];
    // Check for PII access
    const piiFlags = checkPIIAccess(intent, schema);
    riskFlags.push(...piiFlags);
    // Check for financial data sensitivity
    const financialFlags = checkFinancialSensitivity(intent, schema);
    riskFlags.push(...financialFlags);
    // Check for compliance requirements
    const complianceFlags = checkCompliance(intent, sql);
    riskFlags.push(...complianceFlags);
    // Check for performance risks
    const performanceFlags = checkPerformanceRisk(intent, sql);
    riskFlags.push(...performanceFlags);
    // Calculate confidence score
    const confidenceScore = calculateConfidence(intent, riskFlags);
    // Determine if query is approved
    const approved = shouldApprove(riskFlags, confidenceScore);
    return {
        approved,
        riskFlags,
        confidenceScore
    };
}
/**
 * Check for PII (Personally Identifiable Information) access
 */
function checkPIIAccess(intent, schema) {
    const flags = [];
    const piiFields = [
        "email", "phone", "ssn", "address", "name",
        "date_of_birth", "passport", "drivers_license"
    ];
    // Check dimensions and filters for PII fields
    const allFields = [
        ...intent.dimensions,
        ...intent.filters.map(f => f.field)
    ];
    for (const field of allFields) {
        if (piiFields.some(pii => field.toLowerCase().includes(pii))) {
            flags.push({
                level: "high",
                reason: `Query accesses PII field: ${field}`,
                category: "pii"
            });
        }
    }
    return flags;
}
/**
 * Check for sensitive financial data access
 */
function checkFinancialSensitivity(intent, schema) {
    const flags = [];
    const sensitiveSchemas = ["transactions", "investment_holdings", "account_balances"];
    if (sensitiveSchemas.includes(schema)) {
        flags.push({
            level: "medium",
            reason: `Query accesses sensitive financial data: ${schema}`,
            category: "financial"
        });
    }
    // Check for large monetary aggregations
    if (intent.metric.includes("revenue") || intent.metric.includes("balance")) {
        if (!intent.dimensions || intent.dimensions.length === 0) {
            flags.push({
                level: "medium",
                reason: "Aggregating financial data without grouping may expose sensitive totals",
                category: "financial"
            });
        }
    }
    return flags;
}
/**
 * Check compliance requirements (GDPR, SOC2, etc.)
 */
function checkCompliance(intent, sql) {
    const flags = [];
    // Ensure read-only operation
    if (!isReadOnly(sql)) {
        flags.push({
            level: "critical",
            reason: "Query attempts write operation - only SELECT allowed",
            category: "compliance"
        });
    }
    // Check for proper time-based filtering (data retention)
    if (!hasTimeFilter(intent) && requiresTimeFilter(intent.metric)) {
        flags.push({
            level: "low",
            reason: "Query lacks time-based filtering - may access old data",
            category: "compliance"
        });
    }
    return flags;
}
/**
 * Check for performance and resource risks
 */
function checkPerformanceRisk(intent, sql) {
    const flags = [];
    // Check for missing filters (full table scan risk)
    if (!intent.filters || intent.filters.length === 0) {
        flags.push({
            level: "medium",
            reason: "Query has no filters - may cause full table scan",
            category: "performance"
        });
    }
    // Check for complex aggregations without limits
    if (intent.dimensions.length > 3) {
        flags.push({
            level: "low",
            reason: "High cardinality grouping may impact performance",
            category: "performance"
        });
    }
    return flags;
}
/**
 * Calculate confidence score (0-1)
 */
function calculateConfidence(intent, flags) {
    let score = 1.0;
    // Reduce score based on risk flags
    for (const flag of flags) {
        switch (flag.level) {
            case "critical":
                score -= 0.5;
                break;
            case "high":
                score -= 0.2;
                break;
            case "medium":
                score -= 0.1;
                break;
            case "low":
                score -= 0.05;
                break;
        }
    }
    // Boost score for well-structured queries
    if (intent.dimensions.length > 0) {
        score += 0.1;
    }
    if (intent.filters.length > 0) {
        score += 0.1;
    }
    return Math.max(0, Math.min(1, score));
}
/**
 * Determine if query should be approved
 */
function shouldApprove(flags, confidence) {
    // Block critical risks
    if (flags.some(f => f.level === "critical")) {
        return false;
    }
    // Block if confidence too low
    if (confidence < 0.3) {
        return false;
    }
    // Block multiple high-risk flags
    const highRiskCount = flags.filter(f => f.level === "high").length;
    if (highRiskCount > 2) {
        return false;
    }
    return true;
}
/**
 * Check if SQL is read-only
 */
function isReadOnly(sql) {
    const writeKeywords = [
        /\bINSERT\b/i,
        /\bUPDATE\b/i,
        /\bDELETE\b/i,
        /\bDROP\b/i,
        /\bTRUNCATE\b/i,
        /\bALTER\b/i,
        /\bCREATE\b/i
    ];
    return !writeKeywords.some(pattern => pattern.test(sql));
}
/**
 * Check if intent has time-based filtering
 */
function hasTimeFilter(intent) {
    if (intent.timeRange) {
        return true;
    }
    const timeFields = ["date", "time", "created_at", "updated_at", "timestamp"];
    return intent.filters.some(f => timeFields.some(tf => f.field.toLowerCase().includes(tf)));
}
/**
 * Check if metric requires time filtering
 */
function requiresTimeFilter(metric) {
    const timeBasedMetrics = [
        "churn", "retention", "growth", "trend",
        "conversion", "revenue", "activity"
    ];
    return timeBasedMetrics.some(m => metric.toLowerCase().includes(m));
}
function createAuditLog(userQuery, intent, sql, governance) {
    return {
        timestamp: new Date().toISOString(),
        userQuery,
        intent,
        sql,
        governance,
        approved: governance.approved
    };
}
// Made with Bob
//# sourceMappingURL=governanceEngine.js.map