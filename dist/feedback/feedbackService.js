"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
class FeedbackService {
    constructor() {
        this.feedbackQueue = [];
        this.maxQueueSize = 1000;
    }
    static getInstance() {
        if (!FeedbackService.instance) {
            FeedbackService.instance = new FeedbackService();
        }
        return FeedbackService.instance;
    }
    /**
     * Collect feedback from a query execution
     */
    collectFeedback(record) {
        const feedbackRecord = {
            id: this.generateId(),
            timestamp: Date.now(),
            ...record,
        };
        this.feedbackQueue.push(feedbackRecord);
        // Prevent memory overflow
        if (this.feedbackQueue.length > this.maxQueueSize) {
            this.flush();
        }
        console.log(`[Feedback] Collected: ${feedbackRecord.approved ? "✓" : "✗"} - ${feedbackRecord.userInput.substring(0, 50)}...`);
    }
    /**
     * Get feedback statistics
     */
    getStats() {
        if (this.feedbackQueue.length === 0) {
            return {
                totalQueries: 0,
                approvalRate: 0,
                avgLatency: 0,
                cacheHitRate: 0,
                topRejectionReasons: [],
            };
        }
        const totalQueries = this.feedbackQueue.length;
        const approvedCount = this.feedbackQueue.filter((r) => r.approved).length;
        const approvalRate = (approvedCount / totalQueries) * 100;
        const totalLatency = this.feedbackQueue.reduce((sum, r) => sum + r.latencyMs, 0);
        const avgLatency = totalLatency / totalQueries;
        const cacheHits = this.feedbackQueue.filter((r) => r.cacheHit).length;
        const cacheHitRate = (cacheHits / totalQueries) * 100;
        // Count rejection reasons
        const rejectionReasons = new Map();
        this.feedbackQueue
            .filter((r) => !r.approved && r.rejectionReason)
            .forEach((r) => {
            const reason = r.rejectionReason;
            rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
        });
        const topRejectionReasons = Array.from(rejectionReasons.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            totalQueries,
            approvalRate,
            avgLatency,
            cacheHitRate,
            topRejectionReasons,
        };
    }
    /**
     * Export feedback for retraining
     */
    exportForRetraining() {
        return this.feedbackQueue.map((record) => ({
            input: record.userInput,
            output: record.correctedSQL || record.generatedSQL,
            approved: record.approved,
        }));
    }
    /**
     * Get recent feedback records
     */
    getRecentFeedback(limit = 10) {
        return this.feedbackQueue.slice(-limit).reverse();
    }
    /**
     * Flush feedback to persistent storage
     * In production, this would write to S3, database, etc.
     */
    flush() {
        console.log(`[Feedback] Flushing ${this.feedbackQueue.length} records to storage...`);
        // In production, write to:
        // - S3/GCS for archival
        // - Data warehouse for analytics
        // - ML pipeline queue for retraining
        // For now, just keep the most recent records
        const keepCount = Math.floor(this.maxQueueSize * 0.5);
        this.feedbackQueue = this.feedbackQueue.slice(-keepCount);
        console.log(`[Feedback] Kept ${this.feedbackQueue.length} most recent records`);
    }
    /**
     * Generate unique ID for feedback record
     */
    generateId() {
        return `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Clear all feedback (for testing)
     */
    clear() {
        this.feedbackQueue = [];
    }
}
exports.default = FeedbackService;
// Made with Bob
//# sourceMappingURL=feedbackService.js.map