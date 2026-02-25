export type FeatureFlag = "usePinecone" | "enableCostEstimator" | "enableFeedbackLogging" | "enableRiskScoring" | "enableQueryCache" | "enableAdvancedRetrieval";
interface FeatureFlags {
    usePinecone: boolean;
    enableCostEstimator: boolean;
    enableFeedbackLogging: boolean;
    enableRiskScoring: boolean;
    enableQueryCache: boolean;
    enableAdvancedRetrieval: boolean;
}
export declare function isEnabled(flag: FeatureFlag): boolean;
export declare function getAllFlags(): FeatureFlags;
export declare function setFlag(flag: FeatureFlag, value: boolean): void;
export declare function logFeatureFlags(): void;
export {};
//# sourceMappingURL=featureFlags.d.ts.map