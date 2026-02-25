import { Expr } from "../types";
/**
 * Convert expression tree to SQL string
 * Recursive traversal with proper parenthesization
 */
export declare function toSQL(expr: Expr): string;
/**
 * Build common metric expressions
 */
export declare const MetricExpressions: {
    /**
     * Churn Rate = Churned Users / Total Users
     */
    churnRate: () => Expr;
    /**
     * Retention Rate = 1 - Churn Rate
     */
    retentionRate: () => Expr;
    /**
     * Conversion Rate = Conversions / Total Visitors
     */
    conversionRate: (conversionColumn: string, totalColumn: string) => Expr;
    /**
     * Average value calculation
     */
    average: (column: string) => string;
    /**
     * Sum calculation
     */
    sum: (column: string) => string;
};
/**
 * Validate expression tree for safety
 * Ensures no SQL injection vectors
 */
export declare function validateExpression(expr: Expr): boolean;
//# sourceMappingURL=expressionTree.d.ts.map