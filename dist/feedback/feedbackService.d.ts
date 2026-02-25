/**
 * Feedback Collection Service
 *
 * Logs user interactions for:
 * - Model retraining
 * - Quality monitoring
 * - RLHF-style fine-tuning
 * - Evaluation datasets
 *
 * In production, this would write to:
 * - S3/GCS for long-term storage
 * - Data warehouse for analytics
 * - ML pipeline for retraining
 */
export interface FeedbackRecord {
    id: string;
    timestamp: number;
    userId: string;
    userRole: string;
    userInput: string;
    intent: string;
    generatedSQL: string;
    executionPlan?: any;
    riskScore?: number;
    correctedSQL?: string;
    approved: boolean;
    rejectionReason?: string;
    latencyMs: number;
    modelUsed: string;
    cacheHit: boolean;
}
export interface FeedbackStats {
    totalQueries: number;
    approvalRate: number;
    avgLatency: number;
    cacheHitRate: number;
    topRejectionReasons: {
        reason: string;
        count: number;
    }[];
}
declare class FeedbackService {
    private static instance;
    private feedbackQueue;
    private maxQueueSize;
    private constructor();
    static getInstance(): FeedbackService;
    /**
     * Collect feedback from a query execution
     */
    collectFeedback(record: Omit<FeedbackRecord, "id" | "timestamp">): void;
    /**
     * Get feedback statistics
     */
    getStats(): FeedbackStats;
    /**
     * Export feedback for retraining
     */
    exportForRetraining(): Array<{
        input: string;
        output: string;
        approved: boolean;
    }>;
    /**
     * Get recent feedback records
     */
    getRecentFeedback(limit?: number): FeedbackRecord[];
    /**
     * Flush feedback to persistent storage
     * In production, this would write to S3, database, etc.
     */
    private flush;
    /**
     * Generate unique ID for feedback record
     */
    private generateId;
    /**
     * Clear all feedback (for testing)
     */
    clear(): void;
}
export default FeedbackService;
//# sourceMappingURL=feedbackService.d.ts.map