export declare function initializePinecone(): void;
export declare function getIndex(): any;
export interface SchemaMetadata {
    type: string;
    tableName?: string;
    columnName?: string;
    description?: string;
}
export declare function upsertSchema(id: string, embedding: number[], metadata: SchemaMetadata): Promise<void>;
export interface QueryMatch {
    id: string;
    score: number;
    metadata?: SchemaMetadata;
}
export declare function querySchema(embedding: number[], topK?: number): Promise<QueryMatch[]>;
export declare function deleteSchema(id: string): Promise<void>;
//# sourceMappingURL=pineconeClient.d.ts.map