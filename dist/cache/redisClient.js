"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
/**
 * Redis Client Singleton
 * Provides caching for:
 * - Intent parsing results
 * - Embeddings
 * - SQL generation
 * - Final responses
 */
class RedisClient {
    constructor() {
        this.connected = false;
        this.client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || "redis://localhost:6379",
        });
        this.client.on("error", (err) => {
            console.error("Redis Client Error:", err);
        });
        this.client.on("connect", () => {
            console.log("Redis Client Connected");
            this.connected = true;
        });
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    async connect() {
        if (!this.connected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.connected) {
            await this.client.disconnect();
            this.connected = false;
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            console.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl = 300) {
        try {
            await this.client.set(key, value, { EX: ttl });
        }
        catch (error) {
            console.error(`Redis SET error for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error(`Redis DEL error for key ${key}:`, error);
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    isConnected() {
        return this.connected;
    }
}
exports.default = RedisClient;
// Made with Bob
//# sourceMappingURL=redisClient.js.map