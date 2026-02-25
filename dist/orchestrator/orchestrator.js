"use strict";
// Orchestrator - Main coordination layer for AI Analyst system (Production v3)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleQuery = handleQuery;
exports.executeQuery = executeQuery;
exports.healthCheck = healthCheck;
const modelRouter_1 = require("../llm/modelRouter");
const intentParser_1 = require("../llm/intentParser");
const schemaRetriever_1 = require("../retrieval/schemaRetriever");
const sqlBuilder_1 = require("../planner/sqlBuilder");
const governanceEngine_1 = require("../governance/governanceEngine");
const tracer_1 = require("../observability/tracer");
const redisClient_1 = __importDefault(require("../cache/redisClient"));
const queryCostEstimator_1 = require("../planner/queryCostEstimator");
const feedbackService_1 = __importDefault(require("../feedback/feedbackService"));
const featureFlags_1 = require("../config/featureFlags");
const queryExecutor_1 = require("../db/queryExecutor");
const auditLogger_1 = require("../observability/auditLogger");
const pineconeClient_1 = require("../retrieval/pineconeClient");
const embeddingService_1 = require("../llm/embeddingService");
/**
 * Main orchestration function with production features
 * - Redis caching
 * - Query cost estimation
 * - Feedback collection
 * - RBAC integration
 */
async function handleQuery(userInput, user) {
    const startTime = Date.now();
    const redis = redisClient_1.default.getInstance();
    const feedbackService = feedbackService_1.default.getInstance();
    return (0, tracer_1.traceAsync)("handleQuery", async (span) => {
        let cacheHit = false;
        try {
            (0, tracer_1.setAttribute)("input.length", userInput.length);
            (0, tracer_1.setAttribute)("input.query", userInput);
            (0, tracer_1.setAttribute)("user.role", user?.role || "unknown");
            // Step 0: Check Redis cache
            const cacheKey = `query:${userInput}`;
            (0, tracer_1.addEvent)("cache_check_start");
            const cached = await redis.get(cacheKey);
            if (cached) {
                cacheHit = true;
                (0, tracer_1.addEvent)("cache_hit");
                (0, tracer_1.setAttribute)("cache.hit", true);
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
            (0, tracer_1.setAttribute)("cache.hit", false);
            (0, tracer_1.addEvent)("cache_miss");
            // Step 1: Model routing
            (0, tracer_1.addEvent)("model_routing_start");
            const modelDecision = (0, modelRouter_1.chooseModel)(userInput);
            (0, tracer_1.setAttribute)("model.selected", modelDecision.model);
            (0, tracer_1.setAttribute)("model.reason", modelDecision.reason);
            (0, tracer_1.addEvent)("model_routing_complete", { model: modelDecision.model });
            // Step 2: Intent parsing
            (0, tracer_1.addEvent)("intent_parsing_start");
            const intent = await (0, tracer_1.traceAsync)("parseIntent", async () => (0, intentParser_1.parseIntent)(userInput, modelDecision.model), { model: modelDecision.model });
            // Validate intent
            if (!(0, intentParser_1.validateIntent)(intent)) {
                throw new Error("Intent validation failed - suspicious patterns detected");
            }
            (0, tracer_1.setAttribute)("intent.metric", intent.metric);
            (0, tracer_1.setAttribute)("intent.dimensions", intent.dimensions.join(","));
            (0, tracer_1.addEvent)("intent_parsing_complete", { metric: intent.metric });
            // Step 3: Schema retrieval (with Pinecone if enabled)
            (0, tracer_1.addEvent)("schema_retrieval_start");
            let schemas;
            if ((0, featureFlags_1.isEnabled)("usePinecone") && (0, featureFlags_1.isEnabled)("enableAdvancedRetrieval")) {
                // Use Pinecone for vector-based retrieval
                const embedding = await (0, embeddingService_1.embed)(userInput);
                const matches = await (0, pineconeClient_1.querySchema)(embedding, 3);
                schemas = matches.map(match => ({
                    name: match.metadata?.tableName || match.id,
                    description: match.metadata?.description || "",
                    score: match.score
                }));
            }
            else {
                // Fallback to traditional retrieval
                schemas = await (0, tracer_1.traceAsync)("retrieveSchema", async () => (0, schemaRetriever_1.retrieveRelevantSchema)(userInput, 1));
            }
            const schema = schemas[0];
            (0, tracer_1.setAttribute)("schema.name", schema.name);
            (0, tracer_1.setAttribute)("schema.score", schema.score);
            (0, tracer_1.addEvent)("schema_retrieval_complete", {
                schema: schema.name,
                score: schema.score
            });
            // Step 4: SQL generation
            (0, tracer_1.addEvent)("sql_generation_start");
            const sql = await (0, tracer_1.traceAsync)("buildSQL", async () => (0, sqlBuilder_1.buildSQL)(intent, schema.name));
            // Validate SQL safety
            if (!(0, sqlBuilder_1.validateSQL)(sql)) {
                throw new Error("SQL validation failed - dangerous operations detected");
            }
            (0, tracer_1.setAttribute)("sql.length", sql.length);
            (0, tracer_1.addEvent)("sql_generation_complete");
            // Step 4.5: Query cost estimation (if enabled)
            let queryCost = {
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
            if ((0, featureFlags_1.isEnabled)("enableCostEstimator")) {
                (0, tracer_1.addEvent)("cost_estimation_start");
                queryCost = (0, queryCostEstimator_1.estimateCost)(sql);
                (0, tracer_1.setAttribute)("cost.estimated", queryCost.estimatedCost);
                (0, tracer_1.setAttribute)("cost.risk", queryCost.risk);
                (0, tracer_1.addEvent)("cost_estimation_complete", {
                    cost: queryCost.estimatedCost,
                    risk: queryCost.risk,
                });
                // Check if user is allowed to run this query
                if (user) {
                    const allowance = (0, queryCostEstimator_1.shouldAllowQuery)(queryCost, user.role);
                    if (!allowance.allowed) {
                        throw new Error(allowance.reason || "Query not allowed");
                    }
                }
            }
            // Step 5: Governance evaluation
            (0, tracer_1.addEvent)("governance_evaluation_start");
            const governance = await (0, tracer_1.traceAsync)("evaluateGovernance", async () => (0, governanceEngine_1.evaluateGovernance)(intent, sql, schema.name));
            (0, tracer_1.setAttribute)("governance.approved", governance.approved);
            (0, tracer_1.setAttribute)("governance.confidence", governance.confidenceScore);
            (0, tracer_1.setAttribute)("governance.risk_count", governance.riskFlags.length);
            (0, tracer_1.addEvent)("governance_evaluation_complete", {
                approved: governance.approved,
                confidence: governance.confidenceScore
            });
            // Step 6: Create audit log
            const auditLog = (0, governanceEngine_1.createAuditLog)(userInput, intent, sql, governance);
            (0, tracer_1.addEvent)("audit_log_created", { approved: governance.approved });
            // Log audit entry
            if ((0, featureFlags_1.isEnabled)("enableFeedbackLogging")) {
                await auditLogger_1.auditLogger.logQueryExecution(user?.id || "anonymous", user?.role || "unknown", userInput, sql, governance.confidenceScore, 0, // Will be updated after execution
                governance.approved);
            }
            // Build result
            const result = {
                intent,
                sql,
                governance,
                schema,
                model: modelDecision.model,
                traceId: (0, tracer_1.getCurrentTraceId)(),
                queryCost,
            };
            const response = {
                success: true,
                result,
                timestamp: new Date().toISOString(),
            };
            // Cache the response
            await redis.set(cacheKey, JSON.stringify(response), 600); // 10 min TTL
            (0, tracer_1.addEvent)("response_cached");
            // Collect feedback (if enabled)
            const latencyMs = Date.now() - startTime;
            if ((0, featureFlags_1.isEnabled)("enableFeedbackLogging")) {
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
            (0, tracer_1.setAttribute)("latency.total_ms", latencyMs);
            return response;
        }
        catch (error) {
            (0, tracer_1.addEvent)("error_occurred", {
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
    }, { "query.type": "analytics" });
}
/**
 * Execute SQL query (read-only) - Production version with Postgres
 */
async function executeQuery(sql) {
    return (0, tracer_1.traceAsync)("executeQuery", async (span) => {
        (0, tracer_1.setAttribute)("sql.query", sql);
        try {
            // Use real Postgres execution if available
            if (process.env.POSTGRES_URL) {
                const result = await (0, queryExecutor_1.executeQuery)(sql);
                (0, tracer_1.setAttribute)("results.count", result.rowCount);
                (0, tracer_1.setAttribute)("execution.time_ms", result.executionTime);
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
            (0, tracer_1.setAttribute)("results.count", mockResults.length);
            return mockResults;
        }
        catch (error) {
            console.error("Query execution failed:", error);
            throw error;
        }
    });
}
/**
 * Health check for system components - Production version
 */
async function healthCheck() {
    const components = {
        llm: process.env.OPENAI_API_KEY ? "connected" : "missing_key",
        redis: "unknown",
        postgres: "unknown",
        pinecone: process.env.PINECONE_API_KEY ? "configured" : "not_configured",
        tracer: "active",
        governance: "active"
    };
    // Test Redis connection
    try {
        const redis = redisClient_1.default.getInstance();
        await redis.get("health_check");
        components.redis = "connected";
    }
    catch (error) {
        components.redis = "disconnected";
    }
    // Test Postgres connection
    if (process.env.POSTGRES_URL) {
        try {
            const isConnected = await (0, queryExecutor_1.testConnection)();
            components.postgres = isConnected ? "connected" : "disconnected";
        }
        catch (error) {
            components.postgres = "error";
        }
    }
    else {
        components.postgres = "not_configured";
    }
    const criticalComponents = ["llm", "redis"];
    const allHealthy = criticalComponents.every(key => components[key] === "connected" || components[key] === "active");
    return {
        status: allHealthy ? "healthy" : "degraded",
        components,
        uptime: process.uptime()
    };
}
// Made with Bob
//# sourceMappingURL=orchestrator.js.map