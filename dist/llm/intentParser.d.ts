import { ParsedIntent } from "../types";
/**
 * Parse natural language query into structured intent using OpenAI
 * Uses JSON mode for reliable structured output
 */
export declare function parseIntent(userInput: string, model: string): Promise<ParsedIntent>;
/**
 * Validate that the parsed intent is safe and reasonable
 */
export declare function validateIntent(intent: ParsedIntent): boolean;
//# sourceMappingURL=intentParser.d.ts.map