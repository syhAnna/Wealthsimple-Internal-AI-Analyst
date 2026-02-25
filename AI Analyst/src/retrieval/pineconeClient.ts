// src/retrieval/pineconeClient.ts

import { Pinecone } from "@pinecone-database/pinecone"
import { trace } from "@opentelemetry/api"

const tracer = trace.getTracer("pinecone-client")

let pineconeInstance: Pinecone | null = null
let indexInstance: any = null

export function initializePinecone() {
  if (!process.env.PINECONE_API_KEY) {
    console.warn("PINECONE_API_KEY not set, vector retrieval will be disabled")
    return
  }

  pineconeInstance = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  })

  if (process.env.PINECONE_INDEX) {
    indexInstance = pineconeInstance.index(process.env.PINECONE_INDEX)
  }
}

export function getIndex() {
  if (!indexInstance) {
    throw new Error("Pinecone index not initialized. Call initializePinecone() first.")
  }
  return indexInstance
}

export interface SchemaMetadata {
  type: string
  tableName?: string
  columnName?: string
  description?: string
}

export async function upsertSchema(
  id: string,
  embedding: number[],
  metadata: SchemaMetadata
): Promise<void> {
  return tracer.startActiveSpan("upsertSchema", async (span) => {
    try {
      const index = getIndex()
      
      await index.upsert([
        {
          id,
          values: embedding,
          metadata
        }
      ])

      span.setAttributes({
        "pinecone.operation": "upsert",
        "pinecone.id": id,
        "pinecone.success": true
      })
    } catch (error) {
      span.setAttributes({
        "pinecone.operation": "upsert",
        "pinecone.error": error instanceof Error ? error.message : "Unknown error",
        "pinecone.success": false
      })
      throw error
    } finally {
      span.end()
    }
  })
}

export interface QueryMatch {
  id: string
  score: number
  metadata?: SchemaMetadata
}

export async function querySchema(
  embedding: number[],
  topK: number = 3
): Promise<QueryMatch[]> {
  return tracer.startActiveSpan("querySchema", async (span) => {
    try {
      const index = getIndex()
      
      const result = await index.query({
        vector: embedding,
        topK,
        includeMetadata: true
      })

      span.setAttributes({
        "pinecone.operation": "query",
        "pinecone.topK": topK,
        "pinecone.matchCount": result.matches?.length || 0,
        "pinecone.success": true
      })

      return (result.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as SchemaMetadata
      }))
    } catch (error) {
      span.setAttributes({
        "pinecone.operation": "query",
        "pinecone.error": error instanceof Error ? error.message : "Unknown error",
        "pinecone.success": false
      })
      throw error
    } finally {
      span.end()
    }
  })
}

export async function deleteSchema(id: string): Promise<void> {
  return tracer.startActiveSpan("deleteSchema", async (span) => {
    try {
      const index = getIndex()
      
      await index.deleteOne(id)

      span.setAttributes({
        "pinecone.operation": "delete",
        "pinecone.id": id,
        "pinecone.success": true
      })
    } catch (error) {
      span.setAttributes({
        "pinecone.operation": "delete",
        "pinecone.error": error instanceof Error ? error.message : "Unknown error",
        "pinecone.success": false
      })
      throw error
    } finally {
      span.end()
    }
  })
}
