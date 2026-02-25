export interface ModelRoutingDecision {
    model: string;
    reason: string;
    estimatedCost: "low" | "medium" | "high";
}
/**
 * Analyzes query complexity and routes to appropriate model
 * Production logic would include:
 * - Token count estimation
 * - Query complexity scoring
 * - Risk level assessment
 * - Cost optimization
 */
export declare function chooseModel(userInput: string): ModelRoutingDecision;
/**
 * Get embedding model (always use cost-effective option)
 */
export declare function getEmbeddingModel(): string;
//# sourceMappingURL=modelRouter.d.ts.map