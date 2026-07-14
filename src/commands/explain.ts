import type { Command } from "commander";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { explainFiberInput } from "../diagnostics/payment-checks.js";
import { printVerboseBlock } from "../reporters/console-reporter.js";
import { printJson } from "../reporters/json-reporter.js";
import { FiberDoctorError } from "../utils/errors.js";

export function registerExplainCommand(program: Command): void {
  program
    .command("explain")
    .description("Explain a Fiber error message or saved response")
    .argument("<input>", "Error text, JSON file path, or saved response")
    .option("--json", "Print JSON output")
    .option("--verbose", "Print raw parsed input after the human summary")
    .action(async (input: string, options: { json?: boolean; verbose?: boolean }) => {
      try {
        const parsedInput = parseExplainInput(input);
        const explanation = explainFiberInput(parsedInput);

        if (options.json) {
          printJson(explanation);
          return;
        }

        console.log("Payment Failure Explanation");
        console.log("");
        console.log(`Category: ${explanation.category}`);
        console.log("");
        console.log("Raw error:");
        console.log(explanation.rawError);
        console.log("");
        console.log("Likely meaning:");
        console.log(explanation.diagnosis);

        if (explanation.suggestions.length > 0) {
          console.log("");
          console.log("Suggested fixes:");
          for (const suggestion of explanation.suggestions) {
            console.log(`- ${suggestion}`);
          }
        }

        if (options.verbose) {
          printVerboseBlock("Raw parsed input:", parsedInput);
        }
      } catch (error) {
        console.log(
          `✗ Explain failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        process.exitCode = 1;
      }
    });
}

function parseExplainInput(input: string): string | Record<string, unknown> {
  const candidatePath = resolve(input);
  if (!existsSync(candidatePath)) {
    return input;
  }

  let text: string;
  try {
    text = readFileSync(candidatePath, "utf8");
  } catch (error) {
    throw new FiberDoctorError(
      `Could not read input file at ${candidatePath}: ${String(error)}`,
    );
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return text;
  }
}
