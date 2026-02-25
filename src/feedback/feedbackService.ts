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
  
  // Input
  userInput: string;
  intent: string;
  
  // Generated output
  generatedSQL: string;
  executionPlan?: any;
  riskScore?: number;
  
  // User feedback
  correctedSQL?: string;
  approved: boolean;
  rejectionReason?: string;
  
  // Metadata
  latencyMs: number;
  modelUsed: string;
  cacheHit: boolean;
}

export interface FeedbackStats {
  totalQueries: number;
  approvalRate: number;
  avgLatency: number;
  cacheHitRate: number;
  topRejectionReasons: { reason: string; count: number }[];
}

class FeedbackService {
  private static instance: FeedbackService;
  private feedbackQueue: FeedbackRecord[] = [];
  private maxQueueSize: number = 1000;

  private constructor() {}

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  /**
   * Collect feedback from a query execution
   */
  collectFeedback(record: Omit<FeedbackRecord, "id" | "timestamp">): void {
    const feedbackRecord: FeedbackRecord = {
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
  getStats(): FeedbackStats {
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
    const rejectionReasons = new Map<string, number>();
    this.feedbackQueue
      .filter((r) => !r.approved && r.rejectionReason)
      .forEach((r) => {
        const reason = r.rejectionReason!;
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
  exportForRetraining(): Array<{
    input: string;
    output: string;
    approved: boolean;
  }> {
    return this.feedbackQueue.map((record) => ({
      input: record.userInput,
      output: record.correctedSQL || record.generatedSQL,
      approved: record.approved,
    }));
  }

  /**
   * Get recent feedback records
   */
  getRecentFeedback(limit: number = 10): FeedbackRecord[] {
    return this.feedbackQueue.slice(-limit).reverse();
  }

  /**
   * Flush feedback to persistent storage
   * In production, this would write to S3, database, etc.
   */
  private flush(): void {
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
  private generateId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear all feedback (for testing)
   */
  clear(): void {
    this.feedbackQueue = [];
  }
}

export default FeedbackService;

// Made with Bob
