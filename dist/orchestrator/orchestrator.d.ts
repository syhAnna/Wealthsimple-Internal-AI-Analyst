import { AnalystResponse } from "../types";
import { User } from "../auth/rbac";
/**
 * Main orchestration function with production features
 * - Redis caching
 * - Query cost estimation
 * - Feedback collection
 * - RBAC integration
 */
export declare function handleQuery(userInput: string, user?: User): Promise<AnalystResponse>;
/**
 * Execute SQL query (read-only) - Production version with Postgres
 */
export declare function executeQuery(sql: string): Promise<any[]>;
/**
 * Health check for system components - Production version
 */
export declare function healthCheck(): Promise<{
    status: string;
    components: Record<string, string>;
    uptime: number;
}>;
//# sourceMappingURL=orchestrator.d.ts.map