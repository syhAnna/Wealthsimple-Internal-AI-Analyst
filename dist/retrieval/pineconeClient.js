"use strict";
// src/retrieval/pineconeClient.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePinecone = initializePinecone;
exports.getIndex = getIndex;
exports.upsertSchema = upsertSchema;
exports.querySchema = querySchema;
exports.deleteSchema = deleteSchema;
const pinecone_1 = require("@pinecone-database/pinecone");
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer("pinecone-client");
let pineconeInstance = null;
let indexInstance = null;
function initializePinecone() {
    if (!process.env.PINECONE_API_KEY) {
        console.warn("PINECONE_API_KEY not set, vector retrieval will be disabled");
        return;
    }
    pineconeInstance = new pinecone_1.Pinecone({
        apiKey: process.env.PINECONE_API_KEY
    });
    if (process.env.PINECONE_INDEX) {
        indexInstance = pineconeInstance.index(process.env.PINECONE_INDEX);
    }
}
function getIndex() {
    if (!indexInstance) {
        throw new Error("Pinecone index not initialized. Call initializePinecone() first.");
    }
    return indexInstance;
}
async function upsertSchema(id, embedding, metadata) {
    return tracer.startActiveSpan("upsertSchema", async (span) => {
        try {
            const index = getIndex();
            await index.upsert([
                {
                    id,
                    values: embedding,
                    metadata
                }
            ]);
            span.setAttributes({
                "pinecone.operation": "upsert",
                "pinecone.id": id,
                "pinecone.success": true
            });
        }
        catch (error) {
            span.setAttributes({
                "pinecone.operation": "upsert",
                "pinecone.error": error instanceof Error ? error.message : "Unknown error",
                "pinecone.success": false
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
async function querySchema(embedding, topK = 3) {
    return tracer.startActiveSpan("querySchema", async (span) => {
        try {
            const index = getIndex();
            const result = await index.query({
                vector: embedding,
                topK,
                includeMetadata: true
            });
            span.setAttributes({
                "pinecone.operation": "query",
                "pinecone.topK": topK,
                "pinecone.matchCount": result.matches?.length || 0,
                "pinecone.success": true
            });
            return (result.matches || []).map((match) => ({
                id: match.id,
                score: match.score || 0,
                metadata: match.metadata
            }));
        }
        catch (error) {
            span.setAttributes({
                "pinecone.operation": "query",
                "pinecone.error": error instanceof Error ? error.message : "Unknown error",
                "pinecone.success": false
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
async function deleteSchema(id) {
    return tracer.startActiveSpan("deleteSchema", async (span) => {
        try {
            const index = getIndex();
            await index.deleteOne(id);
            span.setAttributes({
                "pinecone.operation": "delete",
                "pinecone.id": id,
                "pinecone.success": true
            });
        }
        catch (error) {
            span.setAttributes({
                "pinecone.operation": "delete",
                "pinecone.error": error instanceof Error ? error.message : "Unknown error",
                "pinecone.success": false
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
// Made with Bob
//# sourceMappingURL=pineconeClient.js.map