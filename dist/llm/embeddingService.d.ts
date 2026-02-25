/**
 * Generate embeddings for text using OpenAI's embedding model
 * Used for semantic schema retrieval
 */
export declare function embed(text: string): Promise<number[]>;
/**
 * Batch embed multiple texts (more efficient for bulk operations)
 */
export declare function embedBatch(texts: string[]): Promise<number[][]>;
/**
 * Calculate cosine similarity between two vectors
 * Used for ranking schema relevance
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
//# sourceMappingURL=embeddingService.d.ts.map