export interface Filter {
    field: string;
    operator: string;
    value: string;
}
export interface ParsedIntent {
    metric: string;
    dimensions: string[];
    filters: Filter[];
    timeRange?: string;
}
export interface SchemaDoc {
    name: string;
    description: string;
    embedding?: number[];
}
export interface RetrievedSchema extends SchemaDoc {
    score: number;
}
export type Expr = {
    type: "column";
    name: string;
} | {
    type: "countDistinct";
    column: string;
} | {
    type: "divide";
    left: Expr;
    right: Expr;
} | {
    type: "multiply";
    left: Expr;
    right: Expr;
} | {
    type: "literal";
    value: number;
};
export interface RiskFlag {
    level: "low" | "medium" | "high" | "critical";
    reason: string;
    category: "pii" | "financial" | "compliance" | "performance";
}
export interface GovernanceResult {
    approved: boolean;
    riskFlags: RiskFlag[];
    confidenceScore: number;
}
export interface QueryCost {
    estimatedCost: number;
    risk: "low" | "medium" | "high";
    breakdown: {
        joinCost: number;
        groupByCost: number;
        subqueryCost: number;
        aggregationCost: number;
    };
    warnings: string[];
}
export interface QueryResult {
    intent: ParsedIntent;
    sql: string;
    governance: GovernanceResult;
    schema: RetrievedSchema;
    model: string;
    traceId?: string;
    queryCost?: QueryCost;
}
export interface AnalystResponse {
    success: boolean;
    result?: QueryResult;
    error?: string;
    timestamp: string;
}
//# sourceMappingURL=index.d.ts.map