"use strict";
// src/db/postgresClient.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
exports.pool = new pg_1.Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});
// Graceful shutdown
process.on("SIGTERM", async () => {
    await exports.pool.end();
});
process.on("SIGINT", async () => {
    await exports.pool.end();
});
// Made with Bob
//# sourceMappingURL=postgresClient.js.map