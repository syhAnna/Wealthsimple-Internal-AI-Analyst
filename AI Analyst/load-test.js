import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 },  // Ramp up to 10 users
    { duration: "1m", target: 20 },   // Stay at 20 users
    { duration: "30s", target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests must complete below 2s
    http_req_failed: ["rate<0.05"],    // Error rate must be below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Test 1: Query endpoint
  const queryPayload = JSON.stringify({
    query: "Show customer churn rate by cohort for last 6 months",
  });

  const queryRes = http.post(`${BASE_URL}/query`, queryPayload, {
    headers: { "Content-Type": "application/json" },
  });

  check(queryRes, {
    "query status is 200": (r) => r.status === 200,
    "query response time < 2s": (r) => r.timings.duration < 2000,
    "query has sql": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.sql !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1);

  // Test 2: Health check
  const healthRes = http.get(`${BASE_URL}/health`);

  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
    "health response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 3: Different query patterns
  const queries = [
    "Total active users last month",
    "Revenue by product category",
    "Customer lifetime value analysis",
    "Monthly recurring revenue trend",
  ];

  const randomQuery = queries[Math.floor(Math.random() * queries.length)];
  const randomPayload = JSON.stringify({ query: randomQuery });

  const randomRes = http.post(`${BASE_URL}/query`, randomPayload, {
    headers: { "Content-Type": "application/json" },
  });

  check(randomRes, {
    "random query status is 200": (r) => r.status === 200,
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    "load-test-results.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || "";
  const enableColors = options.enableColors || false;

  let summary = `\n${indent}Load Test Summary\n${indent}${"=".repeat(50)}\n\n`;
  
  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.passes}\n`;
  summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`;
  
  summary += `${indent}Response Times:\n`;
  summary += `${indent}  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += `${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += `${indent}  p(95): ${data.metrics.http_req_duration.values["p(95)"].toFixed(2)}ms\n`;
  summary += `${indent}  p(99): ${data.metrics.http_req_duration.values["p(99)"].toFixed(2)}ms\n`;

  return summary;
}
