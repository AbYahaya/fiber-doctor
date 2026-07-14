import { Command } from "commander";

import { registerChannelsCommand } from "./commands/channels.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerExplainCommand } from "./commands/explain.js";
import { registerReportCommand } from "./commands/report.js";

const program = new Command();

program
  .name("fiber-doctor")
  .description("Diagnostic CLI for Fiber Network nodes")
  .version("0.1.0");

registerCheckCommand(program);
registerChannelsCommand(program);
registerExplainCommand(program);
registerReportCommand(program);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : `Unexpected error: ${String(error)}`,
  );
  process.exitCode = 1;
}
