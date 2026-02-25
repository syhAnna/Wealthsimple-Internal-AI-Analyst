"use strict";
// Main entry point for Wealthsimple AI Analyst
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const server_1 = require("./api/server");
const tracer_1 = require("./observability/tracer");
// Load environment variables
dotenv_1.default.config();
// Validate required environment variables
function validateEnvironment() {
    const required = ["OPENAI_API_KEY"];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error("Missing required environment variables:", missing.join(", "));
        console.error("Please copy .env.example to .env and fill in the values");
        process.exit(1);
    }
}
// Graceful shutdown handler
function setupShutdownHandlers() {
    const shutdown = async (signal) => {
        console.log(`\n${signal} received, shutting down gracefully...`);
        try {
            await (0, tracer_1.shutdownTracer)();
            console.log("Tracer shutdown complete");
            process.exit(0);
        }
        catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
// Main function
async function main() {
    try {
        console.log("🚀 Starting Wealthsimple AI Analyst...");
        // Validate environment
        validateEnvironment();
        console.log("✅ Environment validated");
        // Setup shutdown handlers
        setupShutdownHandlers();
        console.log("✅ Shutdown handlers registered");
        // Start server
        await (0, server_1.startServer)();
    }
    catch (error) {
        console.error("Failed to start application:", error);
        process.exit(1);
    }
}
// Run application
main();
// Made with Bob
//# sourceMappingURL=index.js.map