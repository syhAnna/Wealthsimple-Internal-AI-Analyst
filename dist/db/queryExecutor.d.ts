export interface QueryResult {
    rows: any[];
    rowCount: number;
    executionTime: number;
}
export declare function executeQuery(sql: string): Promise<QueryResult>;
export declare function testConnection(): Promise<boolean>;
//# sourceMappingURL=queryExecutor.d.ts.map