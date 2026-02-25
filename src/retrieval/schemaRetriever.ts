// Schema Retriever - Semantic search for relevant database schemas

import { embed, cosineSimilarity } from "../llm/embeddingService";
import { SchemaDoc, RetrievedSchema } from "../types";

/**
 * In-memory schema catalog
 * In production, this would be:
 * - Stored in a vector database (Pinecone, Qdrant, Weaviate)
 * - Synced with actual database schema
 * - Include column types, constraints, relationships
 */
const schemaDocs: SchemaDoc[] = [
  {
    name: "customer_activity",
    description: "Customer engagement and churn tracking. Contains user_id, churned_user_id, activity_date, cohort_month, region, subscription_tier. Used for churn analysis and cohort retention."
  },
  {
    name: "transactions",
    description: "Financial transaction records. Contains transaction_id, user_id, amount, currency, transaction_date, transaction_type, status. Used for revenue and payment analysis."
  },
  {
    name: "user_profiles",
    description: "User demographic and account information. Contains user_id, created_at, country, age_group, account_type, kyc_status. Used for user segmentation and compliance."
  },
  {
    name: "investment_holdings",
    description: "User investment portfolio data. Contains user_id, asset_id, quantity, purchase_price, current_value, holding_date. Used for portfolio analysis and risk assessment."
  },
  {
    name: "support_tickets",
    description: "Customer support interaction records. Contains ticket_id, user_id, created_at, resolved_at, category, priority, satisfaction_score. Used for support metrics and user satisfaction."
  }
];

/**
 * Initialize embeddings for all schema documents
 * Should be done at startup or cached
 */
export async function initializeSchemaEmbeddings(): Promise<void> {
  console.log("Initializing schema embeddings...");
  
  for (const doc of schemaDocs) {
    if (!doc.embedding) {
      doc.embedding = await embed(doc.description);
    }
  }
  
  console.log(`Initialized embeddings for ${schemaDocs.length} schemas`);
}

/**
 * Retrieve most relevant schema for a given query
 * Uses semantic similarity via embeddings
 */
export async function retrieveRelevantSchema(
  query: string,
  topK: number = 1
): Promise<RetrievedSchema[]> {
  // Ensure embeddings are initialized
  for (const doc of schemaDocs) {
    if (!doc.embedding) {
      doc.embedding = await embed(doc.description);
    }
  }

  // Generate query embedding
  const queryEmbedding = await embed(query);

  // Calculate similarity scores
  const rankedSchemas = schemaDocs
    .map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding!)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return rankedSchemas;
}

/**
 * Get schema by exact name (for validation)
 */
export function getSchemaByName(name: string): SchemaDoc | undefined {
  return schemaDocs.find(doc => doc.name === name);
}

/**
 * List all available schemas
 */
export function listAllSchemas(): SchemaDoc[] {
  return schemaDocs.map(({ name, description }) => ({ name, description }));
}

// Made with Bob
