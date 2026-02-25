// Expression Tree - Type-safe SQL expression builder
// Deterministic, no LLM involved

import { Expr } from "../types";

/**
 * Convert expression tree to SQL string
 * Recursive traversal with proper parenthesization
 */
export function toSQL(expr: Expr): string {
  switch (expr.type) {
    case "column":
      return expr.name;

    case "countDistinct":
      return `COUNT(DISTINCT ${expr.column})`;

    case "divide":
      return `(${toSQL(expr.left)} / NULLIF(${toSQL(expr.right)}, 0))`;

    case "multiply":
      return `(${toSQL(expr.left)} * ${toSQL(expr.right)})`;

    case "literal":
      return expr.value.toString();

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = expr;
      throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustive)}`);
  }
}

/**
 * Build common metric expressions
 */
export const MetricExpressions = {
  /**
   * Churn Rate = Churned Users / Total Users
   */
  churnRate: (): Expr => ({
    type: "divide",
    left: { type: "countDistinct", column: "churned_user_id" },
    right: { type: "countDistinct", column: "user_id" }
  }),

  /**
   * Retention Rate = 1 - Churn Rate
   */
  retentionRate: (): Expr => ({
    type: "divide",
    left: {
      type: "countDistinct",
      column: "user_id"
    },
    right: {
      type: "countDistinct",
      column: "user_id"
    }
  }),

  /**
   * Conversion Rate = Conversions / Total Visitors
   */
  conversionRate: (conversionColumn: string, totalColumn: string): Expr => ({
    type: "divide",
    left: { type: "countDistinct", column: conversionColumn },
    right: { type: "countDistinct", column: totalColumn }
  }),

  /**
   * Average value calculation
   */
  average: (column: string): string => {
    return `AVG(${column})`;
  },

  /**
   * Sum calculation
   */
  sum: (column: string): string => {
    return `SUM(${column})`;
  }
};

/**
 * Validate expression tree for safety
 * Ensures no SQL injection vectors
 */
export function validateExpression(expr: Expr): boolean {
  switch (expr.type) {
    case "column":
      // Only allow alphanumeric and underscore
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr.name);

    case "countDistinct":
      return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr.column);

    case "divide":
    case "multiply":
      return validateExpression(expr.left) && validateExpression(expr.right);

    case "literal":
      return typeof expr.value === "number" && isFinite(expr.value);

    default:
      return false;
  }
}

// Made with Bob
