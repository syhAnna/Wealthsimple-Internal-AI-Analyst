"use strict";
// OpenTelemetry Tracing - Distributed observability
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tracer = void 0;
exports.traceAsync = traceAsync;
exports.addEvent = addEvent;
exports.setAttribute = setAttribute;
exports.getCurrentTraceId = getCurrentTraceId;
exports.shutdownTracer = shutdownTracer;
const sdk_trace_node_1 = require("@opentelemetry/sdk-trace-node");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api = __importStar(require("@opentelemetry/api"));
// Initialize tracer provider
const provider = new sdk_trace_node_1.NodeTracerProvider({
    resource: new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: "wealthsimple-ai-analyst",
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0"
    })
});
// Configure span processor
// In production, use OTLPTraceExporter to send to collector
provider.addSpanProcessor(new sdk_trace_base_1.SimpleSpanProcessor(new sdk_trace_base_1.ConsoleSpanExporter()));
// Register the provider
provider.register();
// Export tracer instance
exports.tracer = api.trace.getTracer("ai-analyst", "1.0.0");
/**
 * Trace a function execution
 */
async function traceAsync(spanName, fn, attributes) {
    return exports.tracer.startActiveSpan(spanName, async (span) => {
        try {
            // Add custom attributes
            if (attributes) {
                Object.entries(attributes).forEach(([key, value]) => {
                    span.setAttribute(key, value);
                });
            }
            const result = await fn(span);
            span.setStatus({ code: api.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: api.SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : "Unknown error"
            });
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    });
}
/**
 * Add event to current span
 */
function addEvent(name, attributes) {
    const span = api.trace.getActiveSpan();
    if (span) {
        span.addEvent(name, attributes);
    }
}
/**
 * Set attribute on current span
 */
function setAttribute(key, value) {
    const span = api.trace.getActiveSpan();
    if (span) {
        span.setAttribute(key, value);
    }
}
/**
 * Get current trace ID for logging correlation
 */
function getCurrentTraceId() {
    const span = api.trace.getActiveSpan();
    if (span) {
        const spanContext = span.spanContext();
        return spanContext.traceId;
    }
    return undefined;
}
/**
 * Shutdown tracer (call on application exit)
 */
async function shutdownTracer() {
    await provider.shutdown();
}
// Made with Bob
//# sourceMappingURL=tracer.js.map