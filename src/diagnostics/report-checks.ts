import type { ChannelSummary } from "./channel-checks.js";
import type { NodeSummary } from "./node-checks.js";
import type { PaymentSummary } from "./payment-checks.js";

export type ReportStatus = "ready" | "degraded" | "blocked";

export type ReportSummary = {
  blockers: string[];
  diagnosis: string;
  overallHealth: ReportStatus;
  receiveReadiness: ReportStatus;
  sendReadiness: ReportStatus;
  suggestions: string[];
};

export function buildReportSummary(input: {
  channelSummary: ChannelSummary;
  nodeSummary: NodeSummary;
  paymentSummary: PaymentSummary;
}): ReportSummary {
  const blockers = buildBlockers(input);
  const sendReadiness = classifySendReadiness(input);
  const receiveReadiness = classifyReceiveReadiness(input);
  const overallHealth = classifyOverallHealth({
    blockers,
    receiveReadiness,
    sendReadiness,
  });

  return {
    blockers,
    diagnosis: buildReportDiagnosis({
      blockers,
      overallHealth,
      receiveReadiness,
      sendReadiness,
    }),
    overallHealth,
    receiveReadiness,
    sendReadiness,
    suggestions: buildPrioritizedSuggestions(input),
  };
}

function buildBlockers(input: {
  channelSummary: ChannelSummary;
  nodeSummary: NodeSummary;
  paymentSummary: PaymentSummary;
}): string[] {
  const blockers: string[] = [];

  if (input.nodeSummary.connectedPeerCount === 0) {
    blockers.push("No connected peers");
  }

  if (input.channelSummary.activeChannels.length === 0) {
    if (input.channelSummary.pendingOpeningChannels.length > 0) {
      blockers.push("No active channels yet; channel openings are still pending");
    } else if (input.channelSummary.failedPendingChannels.length > 0) {
      blockers.push("No active channels; recent channel opening attempts failed");
    } else {
      blockers.push("No active channels");
    }
  }

  if (input.channelSummary.activeChannels.length > 0) {
    if (input.channelSummary.sendReadyChannels.length === 0) {
      blockers.push("No outbound liquidity");
    }

    if (input.channelSummary.receiveReadyChannels.length === 0) {
      blockers.push("No inbound liquidity");
    }
  } else {
    blockers.push("Send readiness depends on opening an active channel");
    blockers.push("Receive readiness depends on opening an active channel");
  }

  if (input.paymentSummary.statusCounts.failed > 0) {
    const category =
      input.paymentSummary.latestFailedExplanation?.category ??
      "recent payment failure";
    blockers.push(`Recent failed payments: ${category}`);
  }

  if (input.paymentSummary.statusCounts.inflight > 0) {
    blockers.push("Recent payments are still inflight");
  }

  return blockers;
}

function classifySendReadiness(input: {
  channelSummary: ChannelSummary;
  nodeSummary: NodeSummary;
  paymentSummary: PaymentSummary;
}): ReportStatus {
  if (
    input.nodeSummary.connectedPeerCount === 0 ||
    input.channelSummary.activeChannels.length === 0 ||
    input.channelSummary.sendReadyChannels.length === 0
  ) {
    return "blocked";
  }

  if (
    input.channelSummary.pendingOpeningChannels.length > 0 ||
    input.paymentSummary.statusCounts.failed > 0 ||
    input.paymentSummary.statusCounts.inflight > 0
  ) {
    return "degraded";
  }

  return "ready";
}

function classifyReceiveReadiness(input: {
  channelSummary: ChannelSummary;
  nodeSummary: NodeSummary;
}): ReportStatus {
  if (
    input.nodeSummary.connectedPeerCount === 0 ||
    input.channelSummary.activeChannels.length === 0 ||
    input.channelSummary.receiveReadyChannels.length === 0
  ) {
    return "blocked";
  }

  if (input.channelSummary.pendingOpeningChannels.length > 0) {
    return "degraded";
  }

  return "ready";
}

function classifyOverallHealth(input: {
  blockers: string[];
  receiveReadiness: ReportStatus;
  sendReadiness: ReportStatus;
}): ReportStatus {
  if (
    input.sendReadiness === "blocked" ||
    input.receiveReadiness === "blocked" ||
    input.blockers.length > 0
  ) {
    return "blocked";
  }

  if (
    input.sendReadiness === "degraded" ||
    input.receiveReadiness === "degraded"
  ) {
    return "degraded";
  }

  return "ready";
}

function buildReportDiagnosis(input: {
  blockers: string[];
  overallHealth: ReportStatus;
  receiveReadiness: ReportStatus;
  sendReadiness: ReportStatus;
}): string {
  const overview =
    input.overallHealth === "ready"
      ? "The node appears generally healthy."
      : input.overallHealth === "degraded"
        ? "The node appears mostly healthy, but some readiness signals are degraded."
        : "The node is reachable, but one or more operator blockers are preventing full payment readiness.";

  return `${overview} Send readiness is ${input.sendReadiness}. Receive readiness is ${input.receiveReadiness}. Top blockers: ${
    input.blockers.length > 0 ? input.blockers.join("; ") : "none"
  }.`;
}

function buildPrioritizedSuggestions(input: {
  channelSummary: ChannelSummary;
  nodeSummary: NodeSummary;
  paymentSummary: PaymentSummary;
}): string[] {
  const suggestions: string[] = [];

  if (input.nodeSummary.connectedPeerCount === 0) {
    suggestions.push("Connect the node to one or more reachable Fiber peers.");
  }

  if (input.channelSummary.activeChannels.length === 0) {
    if (input.channelSummary.pendingOpeningChannels.length > 0) {
      suggestions.push(
        "Monitor pending channel attempts until they either become active or expose a failure detail.",
      );
    } else {
      suggestions.push("Open a channel with a reachable peer.");
    }
  }

  if (input.channelSummary.failedPendingChannels.length > 0) {
    suggestions.push(
      "Inspect the latest failed channel attempt and verify your CKB funding capacity.",
    );
  }

  if (input.channelSummary.sendReadyChannels.length === 0) {
    suggestions.push(
      "Fund or rebalance a channel before attempting to send payments.",
    );
  }

  if (input.channelSummary.receiveReadyChannels.length === 0) {
    suggestions.push(
      "Increase inbound liquidity if you want this node to receive payments.",
    );
  }

  if (input.paymentSummary.latestFailedExplanation) {
    suggestions.push(...input.paymentSummary.latestFailedExplanation.suggestions);
  } else if (input.paymentSummary.statusCounts.succeeded > 0) {
    suggestions.push(
      "Use the successful payment history as a baseline when comparing later failures.",
    );
  }

  return [...new Set(suggestions)];
}
