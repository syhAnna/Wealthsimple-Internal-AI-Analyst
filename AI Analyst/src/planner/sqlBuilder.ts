// SQL Builder - Deterministic query construction from parsed intent

import { ParsedIntent } from "../types";
import { toSQL, MetricExpressions, validateExpression } from "./expressionTree";

/**
 * Build SQL query from parsed intent
 * Uses expression trees for type-safe metric calculation
 */
export function buildSQL(intent: ParsedIntent, tableName: string): string {
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
function buildSelectClause(intent: ParsedIntent): string {
  const selections: string[] = [];
  
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
function buildMetricSQL(metric: string): string {
  switch (metric) {
    case "customer_churn_rate":
    case "churn_rate":
      const churnExpr = MetricExpressions.churnRate();
      if (!validateExpression(churnExpr)) {
        throw new Error("Invalid churn rate expression");
      }
      return toSQL(churnExpr);
    
    case "retention_rate":
      const retentionExpr = MetricExpressions.retentionRate();
      if (!validateExpression(retentionExpr)) {
        throw new Error("Invalid retention rate expression");
      }
      return toSQL(retentionExpr);
    
    case "total_revenue":
      return MetricExpressions.sum("amount");
    
    case "average_transaction_value":
      return MetricExpressions.average("amount");
    
    case "user_count":
      return "COUNT(DISTINCT user_id)";
    
    default:
      throw new Error(`Unsupported metric: ${metric}`);
  }
}

/**
 * Build WHERE clause from filters
 */
function buildWhereClause(intent: ParsedIntent): string {
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
function buildGroupByClause(intent: ParsedIntent): string {
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
function buildOrderByClause(intent: ParsedIntent): string {
  if (!intent.dimensions || intent.dimensions.length === 0) {
    return "";
  }
  
  // Default: order by first dimension
  return `ORDER BY ${sanitizeIdentifier(intent.dimensions[0])}`;
}

/**
 * Sanitize SQL identifier (table/column name)
 */
function sanitizeIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return identifier;
}

/**
 * Sanitize SQL operator
 */
function sanitizeOperator(operator: string): string {
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
function sanitizeValue(value: string): string {
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
export function validateSQL(sql: string): boolean {
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
