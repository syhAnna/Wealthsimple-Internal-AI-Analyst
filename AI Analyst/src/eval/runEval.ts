import dotenv from "dotenv";

// Load environment variables before any other imports
dotenv.config();

import { parseIntent } from "../llm/intentParser";
import testCases from "./testCases.json";
import * as fs from "fs";
import * as path from "path";

interface EvalResult {
  testId: string;
  input: string;
  passed: boolean;
  score: number;
  latency: number;
  errors: string[];
  actualIntent?: any;
}

interface ModelResults {
  modelName: string;
  accuracy: number;
  avgLatency: number;
  avgScore: number;
  totalTests: number;
  passedTests: number;
  results: EvalResult[];
}

async function evaluateTestCase(
  testCase: any,
  modelName: string
): Promise<EvalResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let score = 0;
  let passed = false;

  try {
    const intent = await parseIntent(testCase.input, modelName);
    const latency = Date.now() - startTime;

    // Check metric match
    if (intent.metric === testCase.expectedMetric) {
      score += 0.4;
    } else {
      errors.push(
        `Metric mismatch: expected ${testCase.expectedMetric}, got ${intent.metric}`
      );
    }

    // Check timeRange if expected
    if (testCase.expectedTimeframe) {
      if (intent.timeRange?.includes(testCase.expectedTimeframe)) {
        score += 0.2;
      } else {
        errors.push(
          `TimeRange mismatch: expected ${testCase.expectedTimeframe}, got ${intent.timeRange}`
        );
      }
    } else {
      score += 0.2; // No timeRange expected
    }

    // Check dimensions (groupBy) if expected
    if (testCase.expectedGroupBy) {
      const hasAllDimensions = testCase.expectedGroupBy.every((g: string) =>
        intent.dimensions?.includes(g)
      );
      if (hasAllDimensions) {
        score += 0.2;
      } else {
        errors.push(
          `Dimensions mismatch: expected ${testCase.expectedGroupBy.join(", ")}, got ${intent.dimensions?.join(", ") || "none"}`
        );
      }
    } else {
      score += 0.2; // No dimensions expected
    }

    // Check aggregation (simplified - just check if metric name suggests aggregation)
    if (testCase.expectedAggregation) {
      const metricSuggestsAgg = intent.metric.toLowerCase().includes(testCase.expectedAggregation);
      if (metricSuggestsAgg) {
        score += 0.1;
      } else {
        errors.push(
          `Aggregation hint mismatch: expected ${testCase.expectedAggregation} in metric`
        );
      }
    } else {
      score += 0.1; // No aggregation expected
    }

    // Check filters if expected
    if (testCase.expectedFilter) {
      if (intent.filters && intent.filters.length > 0) {
        score += 0.1;
      } else {
        errors.push(`Expected filters but got none`);
      }
    } else {
      score += 0.1; // No filters expected
    }

    passed = score >= 0.7; // 70% threshold

    return {
      testId: testCase.id,
      input: testCase.input,
      passed,
      score,
      latency,
      errors,
      actualIntent: intent,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);

    return {
      testId: testCase.id,
      input: testCase.input,
      passed: false,
      score: 0,
      latency,
      errors,
    };
  }
}

async function runEvaluation(modelName: string): Promise<ModelResults> {
  console.log(`\n🔬 Evaluating model: ${modelName}`);
  console.log("=".repeat(60));

  const results: EvalResult[] = [];

  for (const testCase of testCases) {
    process.stdout.write(`Testing ${testCase.id}... `);
    const result = await evaluateTestCase(testCase, modelName);
    results.push(result);

    if (result.passed) {
      console.log(`✅ PASS (${(result.score * 100).toFixed(0)}%, ${result.latency}ms)`);
    } else {
      console.log(`❌ FAIL (${(result.score * 100).toFixed(0)}%, ${result.latency}ms)`);
      result.errors.forEach((err) => console.log(`   - ${err}`));
    }
  }

  const passedTests = results.filter((r) => r.passed).length;
  const accuracy = passedTests / results.length;
  const avgLatency =
    results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;

  return {
    modelName,
    accuracy,
    avgLatency,
    avgScore,
    totalTests: results.length,
    passedTests,
    results,
  };
}

async function compareModels(models: string[]): Promise<void> {
  const allResults: ModelResults[] = [];

  for (const model of models) {
    const results = await runEvaluation(model);
    allResults.push(results);
  }

  console.log("\n\n📊 Model Comparison Summary");
  console.log("=".repeat(80));
  console.log(
    "Model".padEnd(20) +
      "Accuracy".padEnd(12) +
      "Avg Score".padEnd(12) +
      "Avg Latency".padEnd(15) +
      "Pass/Total"
  );
  console.log("-".repeat(80));

  allResults.forEach((result) => {
    console.log(
      result.modelName.padEnd(20) +
        `${(result.accuracy * 100).toFixed(1)}%`.padEnd(12) +
        `${(result.avgScore * 100).toFixed(1)}%`.padEnd(12) +
        `${result.avgLatency.toFixed(0)}ms`.padEnd(15) +
        `${result.passedTests}/${result.totalTests}`
    );
  });

  // Save results to file
  const outputDir = path.join(__dirname, "../../eval-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = path.join(outputDir, `eval-${timestamp}.json`);

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        models: allResults,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Results saved to: ${outputPath}`);

  // Determine best model
  const bestModel = allResults.reduce((best, current) =>
    current.accuracy > best.accuracy ? current : best
  );

  console.log(`\n🏆 Best Model: ${bestModel.modelName}`);
  console.log(`   Accuracy: ${(bestModel.accuracy * 100).toFixed(1)}%`);
  console.log(`   Avg Latency: ${bestModel.avgLatency.toFixed(0)}ms`);
  console.log(`   Avg Score: ${(bestModel.avgScore * 100).toFixed(1)}%`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npm run eval [model1] [model2] ...");
    console.log("Example: npm run eval gpt-4o-mini gpt-4o");
    console.log("\nRunning default evaluation with gpt-4o-mini...\n");
    await runEvaluation("gpt-4o-mini");
  } else if (args.length === 1) {
    await runEvaluation(args[0]);
  } else {
    await compareModels(args);
  }
}

main().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});

// Made with Bob
