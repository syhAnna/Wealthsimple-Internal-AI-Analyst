"use strict";
// src/db/queryExecutor.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeQuery = executeQuery;
exports.testConnection = testConnection;
const postgresClient_1 = require("./postgresClient");
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer("query-executor");
async function executeQuery(sql) {
    return tracer.startActiveSpan("executeQuery", async (span) => {
        const startTime = Date.now();
        try {
            // Enforce read-only queries
            const normalizedSql = sql.trim().toUpperCase();
            if (!normalizedSql.startsWith("SELECT")) {
                throw new Error("Only read-only SELECT queries are allowed");
            }
            // Additional safety checks
            const dangerousKeywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE"];
            for (const keyword of dangerousKeywords) {
                if (normalizedSql.includes(keyword)) {
                    throw new Error(`Dangerous keyword detected: ${keyword}`);
                }
            }
            const client = await postgresClient_1.pool.connect();
            try {
                // Set transaction to read-only
                await client.query("SET TRANSACTION READ ONLY");
                const result = await client.query(sql);
                const executionTime = Date.now() - startTime;
                span.setAttributes({
                    "query.rowCount": result.rowCount || 0,
                    "query.executionTime": executionTime,
                    "query.success": true
                });
                return {
                    rows: result.rows,
                    rowCount: result.rowCount || 0,
                    executionTime
                };
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            span.setAttributes({
                "query.error": error instanceof Error ? error.message : "Unknown error",
                "query.executionTime": executionTime,
                "query.success": false
            });
            throw error;
        }
        finally {
            span.end();
        }
    });
}
async function testConnection() {
    try {
        const client = await postgresClient_1.pool.connect();
        await client.query("SELECT 1");
        client.release();
        return true;
    }
    catch (error) {
        console.error("Database connection test failed:", error);
        return false;
    }
}
// Made with Bob
//# sourceMappingURL=queryExecutor.js.map