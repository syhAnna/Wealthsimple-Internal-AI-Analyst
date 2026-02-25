import { SchemaDoc, RetrievedSchema } from "../types";
/**
 * Initialize embeddings for all schema documents
 * Should be done at startup or cached
 */
export declare function initializeSchemaEmbeddings(): Promise<void>;
/**
 * Retrieve most relevant schema for a given query
 * Uses semantic similarity via embeddings
 */
export declare function retrieveRelevantSchema(query: string, topK?: number): Promise<RetrievedSchema[]>;
/**
 * Get schema by exact name (for validation)
 */
export declare function getSchemaByName(name: string): SchemaDoc | undefined;
/**
 * List all available schemas
 */
export declare function listAllSchemas(): SchemaDoc[];
//# sourceMappingURL=schemaRetriever.d.ts.map