"use strict";
// Embedding service for semantic search and schema retrieval
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embed = embed;
exports.embedBatch = embedBatch;
exports.cosineSimilarity = cosineSimilarity;
const openai_1 = __importDefault(require("openai"));
const modelRouter_1 = require("./modelRouter");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
/**
 * Generate embeddings for text using OpenAI's embedding model
 * Used for semantic schema retrieval
 */
async function embed(text) {
    try {
        const response = await openai.embeddings.create({
            model: (0, modelRouter_1.getEmbeddingModel)(),
            input: text
        });
        return response.data[0].embedding;
    }
    catch (error) {
        console.error("Embedding generation failed:", error);
        throw new Error("Failed to generate embeddings");
    }
}
/**
 * Batch embed multiple texts (more efficient for bulk operations)
 */
async function embedBatch(texts) {
    try {
        const response = await openai.embeddings.create({
            model: (0, modelRouter_1.getEmbeddingModel)(),
            input: texts
        });
        return response.data.map(item => item.embedding);
    }
    catch (error) {
        console.error("Batch embedding generation failed:", error);
        throw new Error("Failed to generate batch embeddings");
    }
}
/**
 * Calculate cosine similarity between two vectors
 * Used for ranking schema relevance
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error("Vectors must have same dimensions");
    }
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
}
// Made with Bob
//# sourceMappingURL=embeddingService.js.map