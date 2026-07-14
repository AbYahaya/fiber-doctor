import type { Command } from "commander";

import { loadConfig } from "../config/load-config.js";
import { buildNodeSummary } from "../diagnostics/node-checks.js";
import { getNodeInfo, listPeers } from "../fiber/rpc-methods.js";
import { FiberRpcClient } from "../fiber/rpc-client.js";
import {
  printDiagnosticResults,
  printVerboseBlock,
} from "../reporters/console-reporter.js";
import { printJson } from "../reporters/json-reporter.js";
import { FiberDoctorError, FiberNetworkError } from "../utils/errors.js";
import {
  formatMaybeHexCount,
} from "../utils/format.js";

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Check whether a Fiber RPC endpoint is reachable")
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

        const summary = buildNodeSummary({
          nodeInfo: await getNodeInfo(client),
          peers: (await listPeers(client)).peers ?? [],
        });

        const payload = {
          rpcUrl: config.rpcUrl,
          diagnostics: summary.diagnostics,
          node: {
            version: summary.nodeInfo.version,
            pubkey: summary.nodeInfo.pubkey,
            chainHash: summary.nodeInfo.chain_hash,
            network: summary.derivedNetwork,
            status: summary.nodeStatus,
            reportedPeerCount: formatMaybeHexCount(summary.nodeInfo.peers_count),
            reportedChannelCount: formatMaybeHexCount(summary.nodeInfo.channel_count),
            connectedPeers: summary.connectedPeerCount,
          },
        };

        if (options.json) {
          printJson(payload);
          return;
        }

        console.log("Fiber Doctor Check");
        console.log("");
        console.log(`RPC URL: ${config.rpcUrl}`);

        printDiagnosticResults(summary.diagnostics);

        if (summary.nodeInfo.version) {
          console.log(`Version: ${summary.nodeInfo.version}`);
        }

        if (summary.nodeInfo.chain_hash) {
          console.log(`Chain hash: ${summary.nodeInfo.chain_hash}`);
        }
        console.log(`Network: ${summary.derivedNetwork}`);
        console.log(`Node status: ${summary.nodeStatus}`);

        console.log(
          `Reported peer count: ${formatMaybeHexCount(summary.nodeInfo.peers_count)}`,
        );
        console.log(
          `Reported channel count: ${formatMaybeHexCount(summary.nodeInfo.channel_count)}`,
        );
        console.log(`Connected peers: ${summary.connectedPeerCount}`);

        if (options.verbose) {
          printVerboseBlock("Raw structured output:", payload);
        }
      } catch (error) {
        renderCheckError(error);
        process.exitCode = 1;
      }
    });
}

function renderCheckError(error: unknown): void {
  if (error instanceof FiberNetworkError) {
    console.log("✗ Fiber RPC unreachable");
    console.log(`Reason: ${error.message}`);
    console.log("Possible causes:");
    console.log("- Fiber node is not running");
    console.log("- The RPC URL or port is incorrect");
    console.log("- The RPC port is blocked or not exposed");
    return;
  }

  if (error instanceof FiberDoctorError) {
    console.log(`✗ Health check failed: ${error.message}`);
    return;
  }

  console.log(
    `✗ Health check failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
