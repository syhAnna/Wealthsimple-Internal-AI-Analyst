"use strict";
// Intent Parser - Structured LLM output for query understanding
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIntent = parseIntent;
exports.validateIntent = validateIntent;
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
// Zod schema for validation
const IntentSchema = zod_1.z.object({
    metric: zod_1.z.string().describe("The primary metric to calculate (e.g., 'customer_churn_rate')"),
    dimensions: zod_1.z.array(zod_1.z.string()).describe("Grouping dimensions (e.g., ['cohort_month', 'region'])"),
    filters: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.string(),
        value: zod_1.z.string()
    })).describe("Filter conditions to apply"),
    timeRange: zod_1.z.string().optional().describe("Time range for the query (e.g., 'last 6 months')")
});
/**
 * Parse natural language query into structured intent using OpenAI
 * Uses JSON mode for reliable structured output
 */
async function parseIntent(userInput, model) {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
function validateIntent(intent) {
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
//# sourceMappingURL=intentParser.js.map