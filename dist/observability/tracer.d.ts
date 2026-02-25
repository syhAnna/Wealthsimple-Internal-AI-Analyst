import * as api from "@opentelemetry/api";
export declare const tracer: api.Tracer;
/**
 * Trace a function execution
 */
export declare function traceAsync<T>(spanName: string, fn: (span: api.Span) => Promise<T>, attributes?: Record<string, string | number | boolean>): Promise<T>;
/**
 * Add event to current span
 */
export declare function addEvent(name: string, attributes?: Record<string, any>): void;
/**
 * Set attribute on current span
 */
export declare function setAttribute(key: string, value: string | number | boolean): void;
/**
 * Get current trace ID for logging correlation
 */
export declare function getCurrentTraceId(): string | undefined;
/**
 * Shutdown tracer (call on application exit)
 */
export declare function shutdownTracer(): Promise<void>;
//# sourceMappingURL=tracer.d.ts.map