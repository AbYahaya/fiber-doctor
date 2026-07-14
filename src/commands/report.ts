import type { Command } from "commander";

import { loadConfig } from "../config/load-config.js";
import { buildChannelSummary } from "../diagnostics/channel-checks.js";
import { buildNodeSummary } from "../diagnostics/node-checks.js";
import { buildPaymentSummary } from "../diagnostics/payment-checks.js";
import { buildReportSummary } from "../diagnostics/report-checks.js";
import {
  getNodeInfo,
  listChannels,
  listPayments,
  listPeers,
} from "../fiber/rpc-methods.js";
import { FiberRpcClient } from "../fiber/rpc-client.js";
import {
  printDiagnosticResults,
  printVerboseBlock,
} from "../reporters/console-reporter.js";
import { printJson } from "../reporters/json-reporter.js";
import { FiberDoctorError, FiberNetworkError } from "../utils/errors.js";
import { formatMaybeHexCount } from "../utils/format.js";

export function registerReportCommand(program: Command): void {
  program
    .command("report")
    .description("Generate a Fiber node diagnostic report")
    .option("--rpc <url>", "Fiber RPC URL")
    .option("--config <path>", "Path to a Fiber Doctor config file")
    .option("--json", "Print JSON output")
    .option("--verbose", "Print raw structured output after the human summary")
    .action(
      async (options: { config?: string; json?: boolean; rpc?: string; verbose?: boolean }) => {
        try {
          const config = loadConfig({
            rpcUrl: options.rpc,
            configPath: options.config,
          });
          const client = new FiberRpcClient(config.rpcUrl);

          const nodeSummary = buildNodeSummary({
            nodeInfo: await getNodeInfo(client),
            peers: (await listPeers(client)).peers ?? [],
          });
          const channelSummary = buildChannelSummary({
            allChannels: (await listChannels(client)).channels ?? [],
            pendingOrFailedChannels:
              (await listChannels(client, { onlyPending: true })).channels ?? [],
          });
          const paymentList = await listPayments(client);
          const paymentSummary = buildPaymentSummary(paymentList.payments ?? []);
          const reportSummary = buildReportSummary({
            channelSummary,
            nodeSummary,
            paymentSummary,
          });

          const payload = {
            rpcUrl: config.rpcUrl,
            diagnostics: [
              ...nodeSummary.diagnostics,
              ...channelSummary.diagnostics,
              ...paymentSummary.diagnostics,
            ],
            node: {
              version: nodeSummary.nodeInfo.version,
              pubkey: nodeSummary.nodeInfo.pubkey,
              chainHash: nodeSummary.nodeInfo.chain_hash,
              network: nodeSummary.derivedNetwork,
              status: nodeSummary.nodeStatus,
              reportedPeerCount: formatMaybeHexCount(
                nodeSummary.nodeInfo.peers_count,
              ),
              reportedChannelCount: formatMaybeHexCount(
                nodeSummary.nodeInfo.channel_count,
              ),
              connectedPeers: nodeSummary.connectedPeerCount,
            },
            channels: {
              total: channelSummary.allChannels.length,
              active: channelSummary.activeChannels.length,
              pending: channelSummary.pendingOpeningChannels.length,
              closed: channelSummary.closedChannels.length,
              pendingOrFailed:
                channelSummary.pendingOrFailedChannels.length,
              pendingOpening: channelSummary.pendingOpeningChannels.length,
              sendReady: channelSummary.sendReadyChannels.length,
              receiveReady: channelSummary.receiveReadyChannels.length,
              totalCapacity: channelSummary.totalCapacity,
              totalLocalBalance: channelSummary.totalLocalBalance,
              totalRemoteBalance: channelSummary.totalRemoteBalance,
            },
            payments: {
              total: paymentSummary.payments.length,
              failed: paymentSummary.statusCounts.failed,
              inflight: paymentSummary.statusCounts.inflight,
              succeeded: paymentSummary.statusCounts.succeeded,
              unknown: paymentSummary.statusCounts.unknown,
            },
            latestFailedPayment: paymentSummary.failedPayments[0] ?? null,
            latestFailedPaymentExplanation:
              paymentSummary.latestFailedExplanation,
            readiness: {
              overallHealth: reportSummary.overallHealth,
              send: reportSummary.sendReadiness,
              receive: reportSummary.receiveReadiness,
            },
            blockers: reportSummary.blockers,
            diagnosis: reportSummary.diagnosis,
            suggestions: reportSummary.suggestions,
          };

          if (options.json) {
            printJson(payload);
            return;
          }

          console.log("Fiber Doctor Report");
          console.log("");
          console.log(`RPC URL: ${config.rpcUrl}`);
          console.log("");

          printDiagnosticResults([
            ...nodeSummary.diagnostics,
            ...channelSummary.diagnostics,
            ...paymentSummary.diagnostics,
          ]);

          console.log("");
          console.log("Node Summary:");
          console.log(`- Version: ${nodeSummary.nodeInfo.version ?? "unknown"}`);
          console.log(`- Pubkey: ${nodeSummary.nodeInfo.pubkey ?? "unknown"}`);
          console.log(
            `- Chain hash: ${nodeSummary.nodeInfo.chain_hash ?? "unknown"}`,
          );
          console.log(`- Network: ${nodeSummary.derivedNetwork}`);
          console.log(`- Node status: ${nodeSummary.nodeStatus}`);
          console.log(
            `- Reported peer count: ${formatMaybeHexCount(
              nodeSummary.nodeInfo.peers_count,
            )}`,
          );
          console.log(
            `- Reported channel count: ${formatMaybeHexCount(
              nodeSummary.nodeInfo.channel_count,
            )}`,
          );
          console.log(`- Connected peers: ${nodeSummary.connectedPeerCount}`);

          console.log("");
          console.log("Operational Summary:");
          console.log(`- Overall health: ${reportSummary.overallHealth}`);
          console.log(`- Send readiness: ${reportSummary.sendReadiness}`);
          console.log(`- Receive readiness: ${reportSummary.receiveReadiness}`);

          if (reportSummary.blockers.length > 0) {
            console.log("Top blockers:");
            for (const blocker of reportSummary.blockers) {
              console.log(`- ${blocker}`);
            }
          }

          console.log("");
          console.log("Channel Summary:");
          console.log(`- Total channels: ${channelSummary.allChannels.length}`);
          console.log(`- Active channels: ${channelSummary.activeChannels.length}`);
          console.log(`- Pending channels: ${channelSummary.pendingOpeningChannels.length}`);
          console.log(`- Closed channels: ${channelSummary.closedChannels.length}`);
          console.log(
            `- Pending or failed channel attempts: ${channelSummary.pendingOrFailedChannels.length}`,
          );
          console.log(
            `- Pending channel openings: ${channelSummary.pendingOpeningChannels.length}`,
          );
          console.log(`- Total capacity: ${channelSummary.totalCapacity}`);
          console.log(`- Total local balance: ${channelSummary.totalLocalBalance}`);
          console.log(`- Total remote balance: ${channelSummary.totalRemoteBalance}`);

          console.log("");
          console.log("Payment Summary:");
          console.log(`- Total payments: ${paymentSummary.payments.length}`);
          console.log(`- Failed payments: ${paymentSummary.statusCounts.failed}`);
          console.log(`- Inflight payments: ${paymentSummary.statusCounts.inflight}`);
          console.log(`- Succeeded payments: ${paymentSummary.statusCounts.succeeded}`);

          if (paymentSummary.latestFailedExplanation) {
            console.log("");
            console.log("Latest failed payment:");
            console.log(
              `- Category: ${paymentSummary.latestFailedExplanation.category}`,
            );
            console.log(
              `- Raw error: ${paymentSummary.latestFailedExplanation.rawError}`,
            );
          }

          console.log("");
          console.log("Diagnosis:");
          console.log(reportSummary.diagnosis);

          if (reportSummary.suggestions.length > 0) {
            console.log("");
            console.log("Suggested actions:");
            for (const suggestion of reportSummary.suggestions) {
              console.log(`- ${suggestion}`);
            }
          }

          if (options.verbose) {
            printVerboseBlock("Raw structured output:", payload);
          }
        } catch (error) {
          renderReportError(error);
          process.exitCode = 1;
        }
      },
    );
}

function renderReportError(error: unknown): void {
  if (error instanceof FiberNetworkError) {
    console.log("✗ Could not generate report because Fiber RPC is unreachable");
    console.log(`Reason: ${error.message}`);
    return;
  }

  if (error instanceof FiberDoctorError) {
    console.log(`✗ Report failed: ${error.message}`);
    return;
  }

  console.log(
    `✗ Report failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
