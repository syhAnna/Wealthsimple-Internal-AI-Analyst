"use strict";
// src/config/featureFlags.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnabled = isEnabled;
exports.getAllFlags = getAllFlags;
exports.setFlag = setFlag;
exports.logFeatureFlags = logFeatureFlags;
const flags = {
    usePinecone: process.env.FLAG_USE_PINECONE === "true",
    enableCostEstimator: process.env.FLAG_ENABLE_COST_ESTIMATOR !== "false", // default true
    enableFeedbackLogging: process.env.FLAG_ENABLE_FEEDBACK_LOGGING !== "false", // default true
    enableRiskScoring: process.env.FLAG_ENABLE_RISK_SCORING !== "false", // default true
    enableQueryCache: process.env.FLAG_ENABLE_QUERY_CACHE !== "false", // default true
    enableAdvancedRetrieval: process.env.FLAG_ENABLE_ADVANCED_RETRIEVAL === "true"
};
function isEnabled(flag) {
    return flags[flag];
}
function getAllFlags() {
    return { ...flags };
}
function setFlag(flag, value) {
    flags[flag] = value;
    console.log(`Feature flag '${flag}' set to ${value}`);
}
// Log all flags on startup
function logFeatureFlags() {
    console.log("Feature Flags Configuration:");
    Object.entries(flags).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
}
// Made with Bob
//# sourceMappingURL=featureFlags.js.map