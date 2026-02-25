/**
 * Query Cost Estimator
 *
 * Prevents runaway queries by estimating computational cost
 * based on SQL complexity heuristics.
 *
 * In production fintech systems, this prevents:
 * - Expensive cross-joins
 * - Unindexed scans
 * - Resource exhaustion attacks
 */
export interface QueryCost {
    estimatedCost: number;
    risk: "low" | "medium" | "high";
    breakdown: {
        joinCost: number;
        groupByCost: number;
        subqueryCost: number;
        aggregationCost: number;
    };
    warnings: string[];
}
export declare function estimateCost(sql: string): QueryCost;
/**
 * Validates if a query should be allowed to execute
 * based on cost and user role
 */
export declare function shouldAllowQuery(cost: QueryCost, userRole: "viewer" | "analyst" | "admin" | "compliance"): {
    allowed: boolean;
    reason?: string;
};
//# sourceMappingURL=queryCostEstimator.d.ts.map