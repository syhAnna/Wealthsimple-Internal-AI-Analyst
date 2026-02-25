// Intent Parser - Structured LLM output for query understanding

import OpenAI from "openai";
import { z } from "zod";
import { ParsedIntent } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Zod schema for validation
const IntentSchema = z.object({
  metric: z.string().describe("The primary metric to calculate (e.g., 'customer_churn_rate')"),
  dimensions: z.array(z.string()).describe("Grouping dimensions (e.g., ['cohort_month', 'region'])"),
  filters: z.array(
    z.object({
      field: z.string(),
      operator: z.string(),
      value: z.string()
    })
  ).describe("Filter conditions to apply"),
  timeRange: z.string().optional().describe("Time range for the query (e.g., 'last 6 months')")
});

/**
 * Parse natural language query into structured intent using OpenAI
 * Uses JSON mode for reliable structured output
 */
export async function parseIntent(
  userInput: string,
  model: string
): Promise<ParsedIntent> {
  try {
    const response = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a financial analytics intent parser.
Extract structured analytics intent from user queries.
Return ONLY valid JSON matching this schema:
{
  "metric": "string (e.g., 'customer_churn_rate', 'revenue_growth')",
  "dimensions": ["array of grouping fields"],
  "filters": [{"field": "string", "operator": "string", "value": "string"}],
  "timeRange": "optional time range description"
}

Common metrics:
- customer_churn_rate: churned users / total users
- revenue_growth: revenue change over time
- user_retention: retained users / initial cohort
- conversion_rate: conversions / total visitors

Be precise and use snake_case for field names.`
        },
        {
          role: "user",
          content: userInput
        }
      ],
      temperature: 0.1 // Low temperature for consistency
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);
    return IntentSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Intent validation failed:", error.errors);
      throw new Error("Failed to parse intent: invalid structure");
    }
    console.error("Intent parsing failed:", error);
    throw new Error("Failed to parse user intent");
  }
}

/**
 * Validate that the parsed intent is safe and reasonable
 */
export function validateIntent(intent: ParsedIntent): boolean {
  // Check for suspicious patterns
  const suspiciousKeywords = ["drop", "delete", "truncate", "alter", "grant"];
  const allText = JSON.stringify(intent).toLowerCase();
  
  for (const keyword of suspiciousKeywords) {
    if (allText.includes(keyword)) {
      console.warn(`Suspicious keyword detected: ${keyword}`);
      return false;
    }
  }
  
  // Ensure metric is specified
  if (!intent.metric || intent.metric.trim().length === 0) {
    return false;
  }
  
  return true;
}

// Made with Bob
