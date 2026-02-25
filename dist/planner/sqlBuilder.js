"use strict";
// SQL Builder - Deterministic query construction from parsed intent
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSQL = buildSQL;
exports.validateSQL = validateSQL;
const expressionTree_1 = require("./expressionTree");
/**
 * Build SQL query from parsed intent
 * Uses expression trees for type-safe metric calculation
 */
function buildSQL(intent, tableName) {
    // Validate intent
    if (!intent.metric) {
        throw new Error("Metric is required");
    }
    // Build SELECT clause based on metric
    const selectClause = buildSelectClause(intent);
    // Build FROM clause
    const fromClause = `FROM ${sanitizeIdentifier(tableName)}`;
    // Build WHERE clause
    const whereClause = buildWhereClause(intent);
    // Build GROUP BY clause
    const groupByClause = buildGroupByClause(intent);
    // Build ORDER BY clause
    const orderByClause = buildOrderByClause(intent);
    // Combine all parts
    const parts = [
        "SELECT",
        selectClause,
        fromClause,
        whereClause,
        groupByClause,
        orderByClause
    ].filter(part => part.length > 0);
    return parts.join("\n") + ";";
}
/**
 * Build SELECT clause with dimensions and metrics
 */
function buildSelectClause(intent) {
    const selections = [];
    // Add dimensions
    intent.dimensions.forEach(dim => {
        selections.push(`  ${sanitizeIdentifier(dim)}`);
    });
    // Add metric calculation
    const metricSQL = buildMetricSQL(intent.metric);
    selections.push(`  ${metricSQL} AS ${sanitizeIdentifier(intent.metric)}`);
    return selections.join(",\n");
}
/**
 * Build metric SQL based on metric name
 */
function buildMetricSQL(metric) {
    switch (metric) {
        case "customer_churn_rate":
        case "churn_rate":
            const churnExpr = expressionTree_1.MetricExpressions.churnRate();
            if (!(0, expressionTree_1.validateExpression)(churnExpr)) {
                throw new Error("Invalid churn rate expression");
            }
            return (0, expressionTree_1.toSQL)(churnExpr);
        case "retention_rate":
            const retentionExpr = expressionTree_1.MetricExpressions.retentionRate();
            if (!(0, expressionTree_1.validateExpression)(retentionExpr)) {
                throw new Error("Invalid retention rate expression");
            }
            return (0, expressionTree_1.toSQL)(retentionExpr);
        case "total_revenue":
            return expressionTree_1.MetricExpressions.sum("amount");
        case "average_transaction_value":
            return expressionTree_1.MetricExpressions.average("amount");
        case "user_count":
            return "COUNT(DISTINCT user_id)";
        default:
            throw new Error(`Unsupported metric: ${metric}`);
    }
}
/**
 * Build WHERE clause from filters
 */
function buildWhereClause(intent) {
    if (!intent.filters || intent.filters.length === 0) {
        return "";
    }
    const conditions = intent.filters.map(filter => {
        const field = sanitizeIdentifier(filter.field);
        const operator = sanitizeOperator(filter.operator);
        const value = sanitizeValue(filter.value);
        return `  ${field} ${operator} ${value}`;
    });
    return "WHERE\n" + conditions.join(" AND\n");
}
/**
 * Build GROUP BY clause from dimensions
 */
function buildGroupByClause(intent) {
    if (!intent.dimensions || intent.dimensions.length === 0) {
        return "";
    }
    const groupFields = intent.dimensions
        .map(dim => `  ${sanitizeIdentifier(dim)}`)
        .join(",\n");
    return "GROUP BY\n" + groupFields;
}
/**
 * Build ORDER BY clause
 */
function buildOrderByClause(intent) {
    if (!intent.dimensions || intent.dimensions.length === 0) {
        return "";
    }
    // Default: order by first dimension
    return `ORDER BY ${sanitizeIdentifier(intent.dimensions[0])}`;
}
/**
 * Sanitize SQL identifier (table/column name)
 */
function sanitizeIdentifier(identifier) {
    // Only allow alphanumeric and underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
        throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
}
/**
 * Sanitize SQL operator
 */
function sanitizeOperator(operator) {
    const allowedOperators = ["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"];
    const normalized = operator.toUpperCase();
    if (!allowedOperators.includes(normalized)) {
        throw new Error(`Invalid operator: ${operator}`);
    }
    return normalized;
}
/**
 * Sanitize and quote value
 */
function sanitizeValue(value) {
    // Check if numeric
    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return value;
    }
    // Quote string values and escape single quotes
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
}
/**
 * Validate generated SQL for safety
 */
function validateSQL(sql) {
    const dangerous = [
        /\bDROP\b/i,
        /\bDELETE\b/i,
        /\bTRUNCATE\b/i,
        /\bALTER\b/i,
        /\bGRANT\b/i,
        /\bREVOKE\b/i,
        /\bINSERT\b/i,
        /\bUPDATE\b/i,
        /\bEXEC\b/i,
        /\bEXECUTE\b/i,
        /;.*SELECT/i // Multiple statements
    ];
    for (const pattern of dangerous) {
        if (pattern.test(sql)) {
            return false;
        }
    }
    return true;
}
// Made with Bob
//# sourceMappingURL=sqlBuilder.js.map