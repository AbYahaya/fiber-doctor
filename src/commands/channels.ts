import type { Command } from "commander";

import { loadConfig } from "../config/load-config.js";
import { buildChannelSummary } from "../diagnostics/channel-checks.js";
import { listChannels } from "../fiber/rpc-methods.js";
import { FiberRpcClient } from "../fiber/rpc-client.js";
import {
  printDiagnosticResults,
  printVerboseBlock,
} from "../reporters/console-reporter.js";
import { printJson } from "../reporters/json-reporter.js";
import { FiberDoctorError, FiberNetworkError } from "../utils/errors.js";
import { formatBalance } from "../utils/format.js";

export function registerChannelsCommand(program: Command): void {
  program
    .command("channels")
    .description("Inspect Fiber channel readiness")
    .option("--rpc <url>", "Fiber RPC URL")
    .option("--config <path>", "Path to a Fiber Doctor config file")
    .option("--json", "Print JSON output")
    .option("--verbose", "Print raw structured output after the human summary")
    .action(async (options: { rpc?: string; config?: string; json?: boolean; verbose?: boolean }) => {
      try {
        const config = loadConfig({
          rpcUrl: options.rpc,
          configPath: options.config,
        });
        const client = new FiberRpcClient(config.rpcUrl);
        const summary = buildChannelSummary({
          allChannels: (await listChannels(client)).channels ?? [],
          pendingOrFailedChannels:
            (await listChannels(client, { onlyPending: true })).channels ?? [],
        });

        const payload = {
          rpcUrl: config.rpcUrl,
          diagnostics: summary.diagnostics,
          channels: {
            total: summary.allChannels.length,
            active: summary.activeChannels.length,
            pending: summary.pendingOpeningChannels.length,
            closed: summary.closedChannels.length,
            pendingOrFailed: summary.pendingOrFailedChannels.length,
            pendingOpening: summary.pendingOpeningChannels.length,
            sendReady: summary.sendReadyChannels.length,
            receiveReady: summary.receiveReadyChannels.length,
            totalCapacity: summary.totalCapacity,
            totalLocalBalance: summary.totalLocalBalance,
            totalRemoteBalance: summary.totalRemoteBalance,
          },
          latestPendingAttempt: summary.pendingOpeningChannels[0] ?? null,
          latestFailedAttempt: summary.failedPendingChannels[0] ?? null,
          diagnosis: summary.diagnosis,
          suggestions: summary.suggestions,
        };

        if (options.json) {
          printJson(payload);
          return;
        }

        console.log("Channel Diagnostics");
        console.log("");
        console.log(`Total channels: ${summary.allChannels.length}`);
        console.log(`Active channels: ${summary.activeChannels.length}`);
        console.log(`Pending channels: ${summary.pendingOpeningChannels.length}`);
        console.log(`Closed channels: ${summary.closedChannels.length}`);
        console.log(
          `Pending or failed channel attempts: ${summary.pendingOrFailedChannels.length}`,
        );
        console.log(
          `Pending channel openings: ${summary.pendingOpeningChannels.length}`,
        );
        console.log(`Total capacity: ${summary.totalCapacity}`);
        console.log(`Total local balance: ${summary.totalLocalBalance}`);
        console.log(`Total remote balance: ${summary.totalRemoteBalance}`);
        console.log("");
        printDiagnosticResults(summary.diagnostics);

        const firstActive = summary.activeChannels[0];
        if (firstActive) {
          console.log("");
          console.log("Example active channel:");
          console.log(`- Peer: ${firstActive.pubkey ?? "unknown"}`);
          console.log(`- Local balance: ${formatBalance(firstActive.local_balance)}`);
          console.log(`- Remote balance: ${formatBalance(firstActive.remote_balance)}`);
        }

        const firstFailed = summary.failedPendingChannels[0];
        if (firstFailed) {
          console.log("");
          console.log("Latest failed channel attempt:");
          console.log(`- Peer: ${firstFailed.pubkey ?? "unknown"}`);
          console.log(`- State: ${firstFailed.state?.state_name ?? "unknown"}`);
          console.log(`- Flags: ${firstFailed.state?.state_flags ?? "unknown"}`);
          console.log(`- Failure detail: ${firstFailed.failure_detail}`);
        }

        const firstPending = summary.pendingOpeningChannels[0];
        if (firstPending) {
          console.log("");
          console.log("Latest pending channel attempt:");
          console.log(`- Peer: ${firstPending.pubkey ?? "unknown"}`);
          console.log(`- State: ${firstPending.state?.state_name ?? "unknown"}`);
          console.log(`- Flags: ${firstPending.state?.state_flags ?? "unknown"}`);
        }

        console.log("");
        console.log("Diagnosis:");
        console.log(summary.diagnosis);

        if (summary.suggestions.length > 0) {
          console.log("");
          console.log("Suggested actions:");
          for (const suggestion of summary.suggestions) {
            console.log(`- ${suggestion}`);
          }
        }

        if (options.verbose) {
          printVerboseBlock("Raw structured output:", payload);
        }
      } catch (error) {
        renderChannelsError(error);
        process.exitCode = 1;
      }
    });
}

function renderChannelsError(error: unknown): void {
  if (error instanceof FiberNetworkError) {
    console.log("✗ Could not inspect channels because Fiber RPC is unreachable");
    console.log(`Reason: ${error.message}`);
    return;
  }

  if (error instanceof FiberDoctorError) {
    console.log(`✗ Channels command failed: ${error.message}`);
    return;
  }

  console.log(
    `✗ Channels command failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}
