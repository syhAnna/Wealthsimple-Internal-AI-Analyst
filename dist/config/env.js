"use strict";
// src/config/env.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
exports.getEnv = getEnv;
exports.isProduction = isProduction;
exports.isDevelopment = isDevelopment;
const requiredEnvVars = [
    "OPENAI_API_KEY",
    "REDIS_URL"
];
const optionalEnvVars = [
    "POSTGRES_URL",
    "PINECONE_API_KEY",
    "PINECONE_INDEX",
    "ALLOWED_ORIGIN",
    "NODE_ENV",
    "PORT"
];
function validateEnvironment() {
    const missing = [];
    requiredEnvVars.forEach(key => {
        if (!process.env[key]) {
            missing.push(key);
        }
    });
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables:\n${missing.map(v => `  - ${v}`).join("\n")}`);
    }
    // Warn about optional but recommended vars
    const missingOptional = [];
    optionalEnvVars.forEach(key => {
        if (!process.env[key]) {
            missingOptional.push(key);
        }
    });
    if (missingOptional.length > 0) {
        console.warn(`Optional environment variables not set:\n${missingOptional.map(v => `  - ${v}`).join("\n")}`);
    }
    console.log("✓ Environment validation passed");
}
function getEnv(key, defaultValue) {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value || defaultValue;
}
function isProduction() {
    return process.env.NODE_ENV === "production";
}
function isDevelopment() {
    return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
}
// Made with Bob
//# sourceMappingURL=env.js.map