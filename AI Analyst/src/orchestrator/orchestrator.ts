// Orchestrator - Main coordination layer for AI Analyst system (Production v3)

import { chooseModel } from "../llm/modelRouter";
import { parseIntent, validateIntent } from "../llm/intentParser";
import { retrieveRelevantSchema } from "../retrieval/schemaRetriever";
import { buildSQL, validateSQL } from "../planner/sqlBuilder";
import { evaluateGovernance, createAuditLog } from "../governance/governanceEngine";
import { traceAsync, setAttribute, addEvent, getCurrentTraceId } from "../observability/tracer";
import { QueryResult, AnalystResponse, QueryCost } from "../types";
import RedisClient from "../cache/redisClient";
import { estimateCost, shouldAllowQuery } from "../planner/queryCostEstimator";
import FeedbackService from "../feedback/feedbackService";
import { User } from "../auth/rbac";
import { isEnabled } from "../config/featureFlags";
import { executeQuery as executePostgresQuery, testConnection } from "../db/queryExecutor";
import { auditLogger } from "../observability/auditLogger";
import { querySchema } from "../retrieval/pineconeClient";
import { embed } from "../llm/embeddingService";

/**
 * Main orchestration function with production features
 * - Redis caching
 * - Query cost estimation
 * - Feedback collection
 * - RBAC integration
 */
export async function handleQuery(
  userInput: string,
  user?: User
): Promise<AnalystResponse> {
  const startTime = Date.now();
  const redis = RedisClient.getInstance();
  const feedbackService = FeedbackService.getInstance();

  return traceAsync(
    "handleQuery",
    async (span) => {
      let cacheHit = false;

      try {
        setAttribute("input.length", userInput.length);
        setAttribute("input.query", userInput);
        setAttribute("user.role", user?.role || "unknown");

        // Step 0: Check Redis cache
        const cacheKey = `query:${userInput}`;
        addEvent("cache_check_start");
        
        const cached = await redis.get(cacheKey);
        if (cached) {
          cacheHit = true;
          addEvent("cache_hit");
          setAttribute("cache.hit", true);
          
          const cachedResponse = JSON.parse(cached);
          
          // Collect feedback for cached response
          feedbackService.collectFeedback({
            userId: user?.id || "anonymous",
            userRole: user?.role || "unknown",
            userInput,
            intent: cachedResponse.result.intent.metric,
            generatedSQL: cachedResponse.result.sql,
            riskScore: cachedResponse.result.governance.confidenceScore,
            approved: true,
            latencyMs: Date.now() - startTime,
            modelUsed: "cached",
            cacheHit: true,
          });
          
          return cachedResponse;
        }
        
        setAttribute("cache.hit", false);
        addEvent("cache_miss");

        // Step 1: Model routing
        addEvent("model_routing_start");
        const modelDecision = chooseModel(userInput);
        setAttribute("model.selected", modelDecision.model);
        setAttribute("model.reason", modelDecision.reason);
        addEvent("model_routing_complete", { model: modelDecision.model });

        // Step 2: Intent parsing
        addEvent("intent_parsing_start");
        const intent = await traceAsync(
          "parseIntent",
          async () => parseIntent(userInput, modelDecision.model),
          { model: modelDecision.model }
        );
        
        // Validate intent
        if (!validateIntent(intent)) {
          throw new Error("Intent validation failed - suspicious patterns detected");
        }
        
        setAttribute("intent.metric", intent.metric);
        setAttribute("intent.dimensions", intent.dimensions.join(","));
        addEvent("intent_parsing_complete", { metric: intent.metric });

        // Step 3: Schema retrieval (with Pinecone if enabled)
        addEvent("schema_retrieval_start");
        let schemas;
        
        if (isEnabled("usePinecone") && isEnabled("enableAdvancedRetrieval")) {
          // Use Pinecone for vector-based retrieval
          const embedding = await embed(userInput);
          const matches = await querySchema(embedding, 3);
          schemas = matches.map(match => ({
            name: match.metadata?.tableName || match.id,
            description: match.metadata?.description || "",
            score: match.score
          }));
        } else {
          // Fallback to traditional retrieval
          schemas = await traceAsync(
            "retrieveSchema",
            async () => retrieveRelevantSchema(userInput, 1)
          );
        }
        
        const schema = schemas[0];
        setAttribute("schema.name", schema.name);
        setAttribute("schema.score", schema.score);
        addEvent("schema_retrieval_complete", {
          schema: schema.name,
          score: schema.score
        });

        // Step 4: SQL generation
        addEvent("sql_generation_start");
        const sql = await traceAsync(
          "buildSQL",
          async () => buildSQL(intent, schema.name)
        );
        
        // Validate SQL safety
        if (!validateSQL(sql)) {
          throw new Error("SQL validation failed - dangerous operations detected");
        }
        
        setAttribute("sql.length", sql.length);
        addEvent("sql_generation_complete");

        // Step 4.5: Query cost estimation (if enabled)
        let queryCost: QueryCost = {
          estimatedCost: 0,
          risk: "low",
          breakdown: {
            joinCost: 0,
            groupByCost: 0,
            subqueryCost: 0,
            aggregationCost: 0
          },
          warnings: []
        };
        
        if (isEnabled("enableCostEstimator")) {
          addEvent("cost_estimation_start");
          queryCost = estimateCost(sql);
          setAttribute("cost.estimated", queryCost.estimatedCost);
          setAttribute("cost.risk", queryCost.risk);
          addEvent("cost_estimation_complete", {
            cost: queryCost.estimatedCost,
            risk: queryCost.risk,
          });

          // Check if user is allowed to run this query
          if (user) {
            const allowance = shouldAllowQuery(queryCost, user.role);
            if (!allowance.allowed) {
              throw new Error(allowance.reason || "Query not allowed");
            }
          }
        }

        // Step 5: Governance evaluation
        addEvent("governance_evaluation_start");
        const governance = await traceAsync(
          "evaluateGovernance",
          async () => evaluateGovernance(intent, sql, schema.name)
        );
        
        setAttribute("governance.approved", governance.approved);
        setAttribute("governance.confidence", governance.confidenceScore);
        setAttribute("governance.risk_count", governance.riskFlags.length);
        addEvent("governance_evaluation_complete", {
          approved: governance.approved,
          confidence: governance.confidenceScore
        });

        // Step 6: Create audit log
        const auditLog = createAuditLog(userInput, intent, sql, governance);
        addEvent("audit_log_created", { approved: governance.approved });

        // Log audit entry
        if (isEnabled("enableFeedbackLogging")) {
          await auditLogger.logQueryExecution(
            user?.id || "anonymous",
            user?.role || "unknown",
            userInput,
            sql,
            governance.confidenceScore,
            0, // Will be updated after execution
            governance.approved
          );
        }

        // Build result
        const result: QueryResult = {
          intent,
          sql,
          governance,
          schema,
          model: modelDecision.model,
          traceId: getCurrentTraceId(),
          queryCost,
        };

        const response: AnalystResponse = {
          success: true,
          result,
          timestamp: new Date().toISOString(),
        };

        // Cache the response
        await redis.set(cacheKey, JSON.stringify(response), 600); // 10 min TTL
        addEvent("response_cached");

        // Collect feedback (if enabled)
        const latencyMs = Date.now() - startTime;
        
        if (isEnabled("enableFeedbackLogging")) {
          feedbackService.collectFeedback({
            userId: user?.id || "anonymous",
            userRole: user?.role || "unknown",
            userInput,
            intent: intent.metric,
            generatedSQL: sql,
            riskScore: governance.confidenceScore,
            approved: governance.approved,
            latencyMs,
            modelUsed: modelDecision.model,
            cacheHit: false,
          });
        }

        setAttribute("latency.total_ms", latencyMs);

        return response;

      } catch (error) {
        addEvent("error_occurred", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
        
        console.error("Query handling failed:", error);

        // Collect error feedback
        feedbackService.collectFeedback({
          userId: user?.id || "anonymous",
          userRole: user?.role || "unknown",
          userInput,
          intent: "error",
          generatedSQL: "",
          approved: false,
          rejectionReason: error instanceof Error ? error.message : "Unknown error",
          latencyMs: Date.now() - startTime,
          modelUsed: "none",
          cacheHit,
        });
        
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
          timestamp: new Date().toISOString()
        };
      }
    },
    { "query.type": "analytics" }
  );
}

/**
 * Execute SQL query (read-only) - Production version with Postgres
 */
export async function executeQuery(sql: string): Promise<any[]> {
  return traceAsync(
    "executeQuery",
    async (span) => {
      setAttribute("sql.query", sql);
      
      try {
        // Use real Postgres execution if available
        if (process.env.POSTGRES_URL) {
          const result = await executePostgresQuery(sql);
          setAttribute("results.count", result.rowCount);
          setAttribute("execution.time_ms", result.executionTime);
          return result.rows;
        }
        
        // Fallback to mock execution for development
        console.log("EXECUTING SQL (MOCK):", sql);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const mockResults = [
          { cohort_month: "2024-01", churn_rate: 0.05 },
          { cohort_month: "2024-02", churn_rate: 0.04 },
          { cohort_month: "2024-03", churn_rate: 0.06 }
        ];
        
        setAttribute("results.count", mockResults.length);
        return mockResults;
      } catch (error) {
        console.error("Query execution failed:", error);
        throw error;
      }
    }
  );
}

/**
 * Health check for system components - Production version
 */
export async function healthCheck(): Promise<{
  status: string;
  components: Record<string, string>;
  uptime: number;
}> {
  const components: Record<string, string> = {
    llm: process.env.OPENAI_API_KEY ? "connected" : "missing_key",
    redis: "unknown",
    postgres: "unknown",
    pinecone: process.env.PINECONE_API_KEY ? "configured" : "not_configured",
    tracer: "active",
    governance: "active"
  };

  // Test Redis connection
  try {
    const redis = RedisClient.getInstance();
    await redis.get("health_check");
    components.redis = "connected";
  } catch (error) {
    components.redis = "disconnected";
  }

  // Test Postgres connection
  if (process.env.POSTGRES_URL) {
    try {
      const isConnected = await testConnection();
      components.postgres = isConnected ? "connected" : "disconnected";
    } catch (error) {
      components.postgres = "error";
    }
  } else {
    components.postgres = "not_configured";
  }

  const criticalComponents = ["llm", "redis"];
  const allHealthy = criticalComponents.every(
    key => components[key] === "connected" || components[key] === "active"
  );

  return {
    status: allHealthy ? "healthy" : "degraded",
    components,
    uptime: process.uptime()
  };
}

// Made with Bob
