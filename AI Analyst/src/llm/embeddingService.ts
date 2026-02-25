// Embedding service for semantic search and schema retrieval

import OpenAI from "openai";
import { getEmbeddingModel } from "./modelRouter";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embeddings for text using OpenAI's embedding model
 * Used for semantic schema retrieval
 */
export async function embed(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: getEmbeddingModel(),
      input: text
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error("Failed to generate embeddings");
  }
}

/**
 * Batch embed multiple texts (more efficient for bulk operations)
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: getEmbeddingModel(),
      input: texts
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error("Batch embedding generation failed:", error);
    throw new Error("Failed to generate batch embeddings");
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Used for ranking schema relevance
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
