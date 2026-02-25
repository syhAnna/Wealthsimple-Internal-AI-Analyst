"use strict";
// Expression Tree - Type-safe SQL expression builder
// Deterministic, no LLM involved
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricExpressions = void 0;
exports.toSQL = toSQL;
exports.validateExpression = validateExpression;
/**
 * Convert expression tree to SQL string
 * Recursive traversal with proper parenthesization
 */
function toSQL(expr) {
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
            const _exhaustive = expr;
            throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustive)}`);
    }
}
/**
 * Build common metric expressions
 */
exports.MetricExpressions = {
    /**
     * Churn Rate = Churned Users / Total Users
     */
    churnRate: () => ({
        type: "divide",
        left: { type: "countDistinct", column: "churned_user_id" },
        right: { type: "countDistinct", column: "user_id" }
    }),
    /**
     * Retention Rate = 1 - Churn Rate
     */
    retentionRate: () => ({
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
    conversionRate: (conversionColumn, totalColumn) => ({
        type: "divide",
        left: { type: "countDistinct", column: conversionColumn },
        right: { type: "countDistinct", column: totalColumn }
    }),
    /**
     * Average value calculation
     */
    average: (column) => {
        return `AVG(${column})`;
    },
    /**
     * Sum calculation
     */
    sum: (column) => {
        return `SUM(${column})`;
    }
};
/**
 * Validate expression tree for safety
 * Ensures no SQL injection vectors
 */
function validateExpression(expr) {
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
//# sourceMappingURL=expressionTree.js.map