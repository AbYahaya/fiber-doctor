import test from "node:test";
import assert from "node:assert/strict";

import { buildReportSummary } from "../src/diagnostics/report-checks.js";

test("report summary marks a healthy node as ready", () => {
  const summary = buildReportSummary({
    channelSummary: {
      activeChannels: [{ state: { state_name: "ChannelReady" } }],
      allChannels: [{ state: { state_name: "ChannelReady" } }],
      closedChannels: [],
      diagnosis: "",
      diagnostics: [],
      failedPendingChannels: [],
      pendingOpeningChannels: [],
      pendingOrFailedChannels: [],
      receiveReadyChannels: [{ remote_balance: "0x10" }],
      sendReadyChannels: [{ local_balance: "0x10" }],
      suggestions: [],
    },
    nodeSummary: {
      connectedPeerCount: 2,
      diagnostics: [],
      nodeInfo: {},
    },
    paymentSummary: {
      diagnostics: [],
      diagnosis: "",
      failedPayments: [],
      latestFailedExplanation: null,
      payments: [],
      statusCounts: {
        failed: 0,
        inflight: 0,
        succeeded: 1,
        unknown: 0,
      },
      suggestions: [],
    },
  });

  assert.equal(summary.overallHealth, "ready");
  assert.equal(summary.sendReadiness, "ready");
  assert.equal(summary.receiveReadiness, "ready");
  assert.deepEqual(summary.blockers, []);
});

test("report summary prioritizes missing peers and channels as blockers", () => {
  const summary = buildReportSummary({
    channelSummary: {
      activeChannels: [],
      allChannels: [],
      closedChannels: [],
      diagnosis: "",
      diagnostics: [],
      failedPendingChannels: [],
      pendingOpeningChannels: [],
      pendingOrFailedChannels: [],
      receiveReadyChannels: [],
      sendReadyChannels: [],
      suggestions: [],
    },
    nodeSummary: {
      connectedPeerCount: 0,
      diagnostics: [],
      nodeInfo: {},
    },
    paymentSummary: {
      diagnostics: [],
      diagnosis: "",
      failedPayments: [],
      latestFailedExplanation: null,
      payments: [],
      statusCounts: {
        failed: 0,
        inflight: 0,
        succeeded: 0,
        unknown: 0,
      },
      suggestions: [],
    },
  });

  assert.equal(summary.overallHealth, "blocked");
  assert.equal(summary.sendReadiness, "blocked");
  assert.equal(summary.receiveReadiness, "blocked");
  assert.ok(summary.blockers.includes("No connected peers"));
  assert.ok(summary.blockers.includes("No active channels"));
  assert.equal(
    summary.suggestions[0],
    "Connect the node to one or more reachable Fiber peers.",
  );
});

test("report summary degrades send readiness when payment failures exist despite usable channels", () => {
  const summary = buildReportSummary({
    channelSummary: {
      activeChannels: [{ state: { state_name: "ChannelReady" } }],
      allChannels: [{ state: { state_name: "ChannelReady" } }],
      closedChannels: [],
      diagnosis: "",
      diagnostics: [],
      failedPendingChannels: [],
      pendingOpeningChannels: [],
      pendingOrFailedChannels: [],
      receiveReadyChannels: [{ remote_balance: "0x10" }],
      sendReadyChannels: [{ local_balance: "0x10" }],
      suggestions: [],
    },
    nodeSummary: {
      connectedPeerCount: 1,
      diagnostics: [],
      nodeInfo: {},
    },
    paymentSummary: {
      diagnostics: [],
      diagnosis: "",
      failedPayments: [{ status: "Failed" }],
      latestFailedExplanation: {
        category: "Insufficient outbound liquidity",
        diagnosis: "x",
        rawError: "x",
        suggestions: ["Fund or rebalance a channel before attempting to send payments."],
      },
      payments: [{ status: "Failed" }],
      statusCounts: {
        failed: 1,
        inflight: 0,
        succeeded: 0,
        unknown: 0,
      },
      suggestions: [],
    },
  });

  assert.equal(summary.overallHealth, "blocked");
  assert.equal(summary.sendReadiness, "degraded");
  assert.equal(summary.receiveReadiness, "ready");
  assert.ok(
    summary.blockers.includes(
      "Recent failed payments: Insufficient outbound liquidity",
    ),
  );
});
