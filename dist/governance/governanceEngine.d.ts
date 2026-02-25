import { ParsedIntent, GovernanceResult } from "../types";
/**
 * Evaluate query for governance compliance and risk
 * This is the critical control layer between AI and data
 */
export declare function evaluateGovernance(intent: ParsedIntent, sql: string, schema: string): GovernanceResult;
/**
 * Generate audit log entry
 */
export interface AuditLogEntry {
    timestamp: string;
    userQuery: string;
    intent: ParsedIntent;
    sql: string;
    governance: GovernanceResult;
    approved: boolean;
    executionTime?: number;
}
export declare function createAuditLog(userQuery: string, intent: ParsedIntent, sql: string, governance: GovernanceResult): AuditLogEntry;
//# sourceMappingURL=governanceEngine.d.ts.map