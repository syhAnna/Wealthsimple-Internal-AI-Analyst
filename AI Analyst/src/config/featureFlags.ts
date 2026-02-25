// src/config/featureFlags.ts

export type FeatureFlag = 
  | "usePinecone"
  | "enableCostEstimator"
  | "enableFeedbackLogging"
  | "enableRiskScoring"
  | "enableQueryCache"
  | "enableAdvancedRetrieval"

interface FeatureFlags {
  usePinecone: boolean
  enableCostEstimator: boolean
  enableFeedbackLogging: boolean
  enableRiskScoring: boolean
  enableQueryCache: boolean
  enableAdvancedRetrieval: boolean
}

const flags: FeatureFlags = {
  usePinecone: process.env.FLAG_USE_PINECONE === "true",
  enableCostEstimator: process.env.FLAG_ENABLE_COST_ESTIMATOR !== "false", // default true
  enableFeedbackLogging: process.env.FLAG_ENABLE_FEEDBACK_LOGGING !== "false", // default true
  enableRiskScoring: process.env.FLAG_ENABLE_RISK_SCORING !== "false", // default true
  enableQueryCache: process.env.FLAG_ENABLE_QUERY_CACHE !== "false", // default true
  enableAdvancedRetrieval: process.env.FLAG_ENABLE_ADVANCED_RETRIEVAL === "true"
}

export function isEnabled(flag: FeatureFlag): boolean {
  return flags[flag]
}

export function getAllFlags(): FeatureFlags {
  return { ...flags }
}

export function setFlag(flag: FeatureFlag, value: boolean): void {
  flags[flag] = value
  console.log(`Feature flag '${flag}' set to ${value}`)
}

// Log all flags on startup
export function logFeatureFlags(): void {
  console.log("Feature Flags Configuration:")
  Object.entries(flags).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
}
