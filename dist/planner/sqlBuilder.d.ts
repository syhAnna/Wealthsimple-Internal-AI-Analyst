import { ParsedIntent } from "../types";
/**
 * Build SQL query from parsed intent
 * Uses expression trees for type-safe metric calculation
 */
export declare function buildSQL(intent: ParsedIntent, tableName: string): string;
/**
 * Validate generated SQL for safety
 */
export declare function validateSQL(sql: string): boolean;
//# sourceMappingURL=sqlBuilder.d.ts.map