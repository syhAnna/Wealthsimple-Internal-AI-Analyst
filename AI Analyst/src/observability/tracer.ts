// OpenTelemetry Tracing - Distributed observability

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SimpleSpanProcessor, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import * as api from "@opentelemetry/api";

// Initialize tracer provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "wealthsimple-ai-analyst",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0"
  })
});

// Configure span processor
// In production, use OTLPTraceExporter to send to collector
provider.addSpanProcessor(
  new SimpleSpanProcessor(new ConsoleSpanExporter())
);

// Register the provider
provider.register();

// Export tracer instance
export const tracer = api.trace.getTracer("ai-analyst", "1.0.0");

/**
 * Trace a function execution
 */
export async function traceAsync<T>(
  spanName: string,
  fn: (span: api.Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
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
    } catch (error) {
      span.setStatus({
        code: api.SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error"
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add event to current span
 */
export function addEvent(name: string, attributes?: Record<string, any>): void {
  const span = api.trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set attribute on current span
 */
export function setAttribute(key: string, value: string | number | boolean): void {
  const span = api.trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * Get current trace ID for logging correlation
 */
export function getCurrentTraceId(): string | undefined {
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
export async function shutdownTracer(): Promise<void> {
  await provider.shutdown();
}
