"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateCost = estimateCost;
exports.shouldAllowQuery = shouldAllowQuery;
function estimateCost(sql) {
    const upperSQL = sql.toUpperCase();
    const warnings = [];
    // Count complexity factors
    const joinCount = (upperSQL.match(/\bJOIN\b/g) || []).length;
    const groupByCount = (upperSQL.match(/\bGROUP BY\b/g) || []).length;
    const subqueryCount = (upperSQL.match(/\bSELECT\b/g) || []).length - 1; // Subtract main query
    const aggregationCount = ((upperSQL.match(/\bCOUNT\(/g) || []).length +
        (upperSQL.match(/\bSUM\(/g) || []).length +
        (upperSQL.match(/\bAVG\(/g) || []).length +
        (upperSQL.match(/\bMAX\(/g) || []).length +
        (upperSQL.match(/\bMIN\(/g) || []).length);
    // Cost weights (tuned for typical OLTP workloads)
    const joinCost = joinCount * 10;
    const groupByCost = groupByCount * 5;
    const subqueryCost = subqueryCount * 8;
    const aggregationCost = aggregationCount * 3;
    const estimatedCost = joinCost + groupByCost + subqueryCost + aggregationCost;
    // Generate warnings
    if (joinCount > 3) {
        warnings.push(`High join count (${joinCount}). Consider denormalization or caching.`);
    }
    if (subqueryCount > 2) {
        warnings.push(`Multiple subqueries detected (${subqueryCount}). May impact performance.`);
    }
    if (upperSQL.includes("SELECT *")) {
        warnings.push("SELECT * detected. Specify columns explicitly for better performance.");
    }
    if (!upperSQL.includes("WHERE") && !upperSQL.includes("LIMIT")) {
        warnings.push("No WHERE clause or LIMIT. Query may scan entire table.");
    }
    if (upperSQL.includes("CROSS JOIN")) {
        warnings.push("CROSS JOIN detected. This can produce cartesian products.");
    }
    // Determine risk level
    let risk;
    if (estimatedCost > 30) {
        risk = "high";
    }
    else if (estimatedCost > 15) {
        risk = "medium";
    }
    else {
        risk = "low";
    }
    return {
        estimatedCost,
        risk,
        breakdown: {
            joinCost,
            groupByCost,
            subqueryCost,
            aggregationCost,
        },
        warnings,
    };
}
/**
 * Validates if a query should be allowed to execute
 * based on cost and user role
 */
function shouldAllowQuery(cost, userRole) {
    // Admins can run anything
    if (userRole === "admin") {
        return { allowed: true };
    }
    // Viewers can only run low-cost queries
    if (userRole === "viewer" && cost.risk !== "low") {
        return {
            allowed: false,
            reason: `Query blocked: viewers can only run low-risk queries. Contact admin for approval.`,
        };
    }
    // Block high-risk queries for analysts
    if (cost.risk === "high" && userRole === "analyst") {
        return {
            allowed: false,
            reason: `Query blocked: estimated cost ${cost.estimatedCost} exceeds analyst threshold. Contact admin for approval.`,
        };
    }
    // Compliance can run medium-risk queries
    if (cost.risk === "medium" && userRole === "compliance") {
        return { allowed: true };
    }
    return { allowed: true };
}
// Made with Bob
//# sourceMappingURL=queryCostEstimator.js.map