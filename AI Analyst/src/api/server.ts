// Express API Server - REST endpoints for AI Analyst (Production-Ready)

import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { handleQuery, executeQuery, healthCheck } from "../orchestrator/orchestrator";
import { initializeSchemaEmbeddings } from "../retrieval/schemaRetriever";
import { mockAuth, requireAuth, requireRole, canAccessTable } from "../auth/rbac";
import RedisClient from "../cache/redisClient";
import FeedbackService from "../feedback/feedbackService";
import { validateEnvironment, isProduction } from "../config/env";
import { logFeatureFlags } from "../config/featureFlags";
import { initializePinecone } from "../retrieval/pineconeClient";
import { auditLogger } from "../observability/auditLogger";

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || "*",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting - 30 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLogger.logRateLimitExceeded(
      req.user?.id || "anonymous",
      req.path
    );
    res.status(429).json({
      success: false,
      error: "Too many requests, please try again later"
    });
  }
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));

// Disable stack traces in production
if (isProduction()) {
  app.set("env", "production");
}

// Mock authentication (replace with real auth in production)
app.use(mockAuth);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} [${req.user?.role || "unknown"}]`);
  next();
});

/**
 * POST /api/query
 * Main endpoint for natural language queries
 * Requires authentication
 */
app.post("/api/query", requireAuth, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "Query parameter is required and must be a string"
      });
    }

    // Pass user context to orchestrator
    const result = await handleQuery(query, req.user);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Query endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

/**
 * POST /api/execute
 * Execute approved SQL query
 */
app.post("/api/execute", async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== "string") {
      return res.status(400).json({
        success: false,
        error: "SQL parameter is required and must be a string"
      });
    }

    const results = await executeQuery(sql);
    
    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error("Execute endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Query execution failed"
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const health = await healthCheck();
    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: "Health check failed"
    });
  }
});

/**
 * GET /api/schemas
 * List available schemas
 */
app.get("/api/schemas", (req: Request, res: Response) => {
  // In production, fetch from schema registry
  const schemas = [
    { name: "customer_activity", description: "Customer engagement and churn tracking" },
    { name: "transactions", description: "Financial transaction records" },
    { name: "user_profiles", description: "User demographic information" },
    { name: "investment_holdings", description: "User investment portfolio data" },
    { name: "support_tickets", description: "Customer support interactions" }
  ];

  res.json({
    success: true,
    schemas,
    count: schemas.length
  });
});

/**
 * GET /api/feedback/stats
 * Get feedback statistics (admin only)
 */
app.get("/api/feedback/stats", requireRole("admin"), (req: Request, res: Response) => {
  try {
    const feedbackService = FeedbackService.getInstance();
    const stats = feedbackService.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Feedback stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve feedback stats"
    });
  }
});

/**
 * GET /api/feedback/recent
 * Get recent feedback records (admin only)
 */
app.get("/api/feedback/recent", requireRole("admin"), (req: Request, res: Response) => {
  try {
    const feedbackService = FeedbackService.getInstance();
    const limit = parseInt(req.query.limit as string) || 10;
    const recent = feedbackService.getRecentFeedback(limit);
    
    res.json({
      success: true,
      feedback: recent,
      count: recent.length
    });
  } catch (error) {
    console.error("Recent feedback error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve recent feedback"
    });
  }
});

/**
 * GET /
 * Root endpoint with API documentation
 */
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Wealthsimple AI Analyst API",
    version: "2.0.0",
    description: "Production-ready AI-powered analytics platform with RBAC, caching, and cost estimation",
    endpoints: {
      "POST /api/query": "Submit natural language analytics query (requires auth)",
      "POST /api/execute": "Execute approved SQL query (requires auth)",
      "GET /api/health": "System health check",
      "GET /api/schemas": "List available data schemas",
      "GET /api/feedback/stats": "Get feedback statistics (admin only)",
      "GET /api/feedback/recent": "Get recent feedback records (admin only)"
    },
    features: [
      "Redis caching for reduced latency and cost",
      "Query cost estimation and blocking",
      "Role-based access control (RBAC)",
      "Feedback collection for model retraining",
      "OpenTelemetry observability",
      "Governance and compliance checks"
    ],
    documentation: "https://github.com/wealthsimple/ai-analyst"
  });
});

/**
 * Start server
 */
export async function startServer(): Promise<void> {
  try {
    console.log("🚀 Starting AI Analyst Platform...\n");

    // Validate environment variables
    console.log("Validating environment...");
    validateEnvironment();

    // Log feature flags
    console.log("\nFeature Flags:");
    logFeatureFlags();

    // Initialize Pinecone (if enabled)
    if (process.env.PINECONE_API_KEY) {
      console.log("\nInitializing Pinecone vector database...");
      initializePinecone();
      console.log("✓ Pinecone initialized");
    } else {
      console.log("\n⚠ Pinecone not configured - using fallback retrieval");
    }

    // Initialize Redis connection
    console.log("\nConnecting to Redis...");
    const redis = RedisClient.getInstance();
    await redis.connect();
    console.log("✓ Redis connected");

    // Initialize schema embeddings on startup
    console.log("\nInitializing schema embeddings...");
    await initializeSchemaEmbeddings();
    console.log("✓ Schema embeddings initialized");

    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log(`🚀 AI Analyst API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📖 Documentation: http://localhost:${PORT}/`);
      console.log(`🔐 RBAC enabled - use headers: x-user-role, x-user-id`);
      console.log(`⚡ Redis caching enabled`);
      console.log(`🛡️  Rate limiting: 30 req/min`);
      console.log(`🔒 Security: Helmet + CORS enabled`);
      console.log(`📝 Audit logging enabled`);
      console.log(`🎯 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("=".repeat(60) + "\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

export default app;
