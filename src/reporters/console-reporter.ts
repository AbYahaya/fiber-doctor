import type { DiagnosticResult } from "../diagnostics/rules.js";

export function printDiagnosticResults(results: DiagnosticResult[]): void {
  for (const result of results) {
    const icon = getStatusIcon(result.status);
    console.log(`${icon} ${result.title}`);

    if (result.details) {
      console.log(`  ${result.details}`);
    }
  }
}

export function printVerboseBlock(title: string, value: unknown): void {
  console.log("");
  console.log(title);
  console.log(JSON.stringify(value, null, 2));
}

function getStatusIcon(status: DiagnosticResult["status"]): string {
  switch (status) {
    case "pass":
      return "✓";
    case "warn":
      return "⚠";
    case "fail":
      return "✗";
  }
}
