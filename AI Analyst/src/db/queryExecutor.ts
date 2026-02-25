// src/db/queryExecutor.ts

import { pool } from "./postgresClient"
import { trace } from "@opentelemetry/api"

const tracer = trace.getTracer("query-executor")

export interface QueryResult {
  rows: any[]
  rowCount: number
  executionTime: number
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  return tracer.startActiveSpan("executeQuery", async (span) => {
    const startTime = Date.now()

    try {
      // Enforce read-only queries
      const normalizedSql = sql.trim().toUpperCase()
      if (!normalizedSql.startsWith("SELECT")) {
        throw new Error("Only read-only SELECT queries are allowed")
      }

      // Additional safety checks
      const dangerousKeywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "TRUNCATE"]
      for (const keyword of dangerousKeywords) {
        if (normalizedSql.includes(keyword)) {
          throw new Error(`Dangerous keyword detected: ${keyword}`)
        }
      }

      const client = await pool.connect()

      try {
        // Set transaction to read-only
        await client.query("SET TRANSACTION READ ONLY")
        
        const result = await client.query(sql)
        const executionTime = Date.now() - startTime

        span.setAttributes({
          "query.rowCount": result.rowCount || 0,
          "query.executionTime": executionTime,
          "query.success": true
        })

        return {
          rows: result.rows,
          rowCount: result.rowCount || 0,
          executionTime
        }
      } finally {
        client.release()
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      
      span.setAttributes({
        "query.error": error instanceof Error ? error.message : "Unknown error",
        "query.executionTime": executionTime,
        "query.success": false
      })

      throw error
    } finally {
      span.end()
    }
  })
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query("SELECT 1")
    client.release()
    return true
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}
