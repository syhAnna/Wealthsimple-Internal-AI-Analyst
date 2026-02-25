// Main entry point for Wealthsimple AI Analyst

import dotenv from "dotenv";
import { startServer } from "./api/server";
import { shutdownTracer } from "./observability/tracer";

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment(): void {
  const required = ["OPENAI_API_KEY"];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("Missing required environment variables:", missing.join(", "));
    console.error("Please copy .env.example to .env and fill in the values");
    process.exit(1);
  }
}

// Graceful shutdown handler
function setupShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    try {
      await shutdownTracer();
      console.log("Tracer shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Main function
async function main(): Promise<void> {
  try {
    console.log("🚀 Starting Wealthsimple AI Analyst...");
    
    // Validate environment
    validateEnvironment();
    console.log("✅ Environment validated");
    
    // Setup shutdown handlers
    setupShutdownHandlers();
    console.log("✅ Shutdown handlers registered");
    
    // Start server
    await startServer();
    
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Run application
main();