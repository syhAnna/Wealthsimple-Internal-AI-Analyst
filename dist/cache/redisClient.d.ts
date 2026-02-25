/**
 * Redis Client Singleton
 * Provides caching for:
 * - Intent parsing results
 * - Embeddings
 * - SQL generation
 * - Final responses
 */
declare class RedisClient {
    private static instance;
    private client;
    private connected;
    private constructor();
    static getInstance(): RedisClient;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    isConnected(): boolean;
}
export default RedisClient;
//# sourceMappingURL=redisClient.d.ts.map