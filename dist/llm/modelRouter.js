"use strict";
// CYOM - Choose Your Own Model Router
// Routes queries to appropriate models based on complexity and risk
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseModel = chooseModel;
exports.getEmbeddingModel = getEmbeddingModel;
/**
 * Analyzes query complexity and routes to appropriate model
 * Production logic would include:
 * - Token count estimation
 * - Query complexity scoring
 * - Risk level assessment
 * - Cost optimization
 */
function chooseModel(userInput) {
    const complexityScore = calculateComplexity(userInput);
    // Simple queries -> cheaper model
    if (complexityScore < 120) {
        return {
            model: "gpt-4o-mini",
            reason: "Simple query, using cost-optimized model",
            estimatedCost: "low"
        };
    }
    // Complex queries -> stronger model
    if (complexityScore > 300) {
        return {
            model: "gpt-4o",
            reason: "Complex query requiring advanced reasoning",
            estimatedCost: "high"
        };
    }
    // Default to balanced model
    return {
        model: "gpt-4o",
        reason: "Standard complexity query",
        estimatedCost: "medium"
    };
}
/**
 * Calculate query complexity score
 * Factors: length, keywords, ambiguity indicators
 */
function calculateComplexity(input) {
    let score = input.length;
    // Boost for complex keywords
    const complexKeywords = [
        "compare", "trend", "forecast", "correlation",
        "cohort", "retention", "attribution", "funnel"
    ];
    complexKeywords.forEach(keyword => {
        if (input.toLowerCase().includes(keyword)) {
            score += 50;
        }
    });
    // Boost for multiple conditions
    const conditionWords = ["and", "or", "where", "when", "if"];
    conditionWords.forEach(word => {
        const matches = input.toLowerCase().split(word).length - 1;
        score += matches * 20;
    });
    return score;
}
/**
 * Get embedding model (always use cost-effective option)
 */
function getEmbeddingModel() {
    return "text-embedding-3-small";
}
// Made with Bob
//# sourceMappingURL=modelRouter.js.map