import type { FiberChannel } from "../fiber/types.js";
import type { DiagnosticResult } from "./rules.js";
import { sumHexBalances } from "../utils/format.js";

export type ChannelSummary = {
  activeChannels: FiberChannel[];
  allChannels: FiberChannel[];
  closedChannels: FiberChannel[];
  diagnosis: string;
  diagnostics: DiagnosticResult[];
  failedPendingChannels: FiberChannel[];
  pendingOpeningChannels: FiberChannel[];
  pendingOrFailedChannels: FiberChannel[];
  receiveReadyChannels: FiberChannel[];
  sendReadyChannels: FiberChannel[];
  suggestions: string[];
  totalCapacity: string;
  totalLocalBalance: string;
  totalRemoteBalance: string;
};

export function buildChannelSummary(input: {
  allChannels: FiberChannel[];
  pendingOrFailedChannels: FiberChannel[];
}): ChannelSummary {
  const activeChannels = input.allChannels.filter(isActiveChannel);
  const closedChannels = input.allChannels.filter(isClosedChannel);
  const failedPendingChannels = input.pendingOrFailedChannels.filter((channel) =>
    Boolean(channel.failure_detail),
  );
  const pendingOpeningChannels = input.pendingOrFailedChannels.filter(
    (channel) => !channel.failure_detail,
  );
  const sendReadyChannels = activeChannels.filter(hasOutboundLiquidity);
  const receiveReadyChannels = activeChannels.filter(hasInboundLiquidity);

  return {
    activeChannels,
    allChannels: input.allChannels,
    closedChannels,
    diagnosis: buildChannelDiagnosis({
      activeChannels,
      failedPendingChannels,
      pendingOpeningChannels,
      receiveReadyChannels,
      sendReadyChannels,
    }),
    diagnostics: buildChannelDiagnostics({
      activeChannels,
      failedPendingChannels,
      pendingOpeningChannels,
      receiveReadyChannels,
      sendReadyChannels,
    }),
    failedPendingChannels,
    pendingOpeningChannels,
    pendingOrFailedChannels: input.pendingOrFailedChannels,
    receiveReadyChannels,
    sendReadyChannels,
    suggestions: buildChannelSuggestions({
      activeChannels,
      failedPendingChannels,
      pendingOpeningChannels,
      receiveReadyChannels,
      sendReadyChannels,
    }),
    totalCapacity: sumHexBalances(
      input.allChannels.map((channel) => channel.capacity),
    ),
    totalLocalBalance: sumHexBalances(
      input.allChannels.map((channel) => channel.local_balance),
    ),
    totalRemoteBalance: sumHexBalances(
      input.allChannels.map((channel) => channel.remote_balance),
    ),
  };
}

function buildChannelDiagnostics(input: {
  activeChannels: FiberChannel[];
  failedPendingChannels: FiberChannel[];
  pendingOpeningChannels: FiberChannel[];
  receiveReadyChannels: FiberChannel[];
  sendReadyChannels: FiberChannel[];
}): DiagnosticResult[] {
  return [
    input.activeChannels.length > 0
      ? { status: "pass", title: "At least one active channel found" }
      : { status: "warn", title: "No active channels found" },
    input.sendReadyChannels.length > 0
      ? { status: "pass", title: "Outbound liquidity detected" }
      : { status: "fail", title: "No outbound liquidity detected" },
    input.receiveReadyChannels.length > 0
      ? { status: "pass", title: "Inbound liquidity detected" }
      : { status: "warn", title: "No inbound liquidity detected" },
    input.pendingOpeningChannels.length > 0
      ? {
          status: "warn",
          title: "Pending channel opening attempts detected",
          details: `${input.pendingOpeningChannels.length} pending channel attempt(s) still in progress`,
        }
      : { status: "pass", title: "No pending channel opening attempts detected" },
    input.failedPendingChannels.length > 0
      ? {
          status: "warn",
          title: "Recent failed channel attempts detected",
          details: input.failedPendingChannels[0]?.failure_detail ?? "unknown failure",
        }
      : { status: "pass", title: "No recent failed channel attempts detected" },
  ];
}

function buildChannelDiagnosis(input: {
  activeChannels: FiberChannel[];
  failedPendingChannels: FiberChannel[];
  pendingOpeningChannels: FiberChannel[];
  receiveReadyChannels: FiberChannel[];
  sendReadyChannels: FiberChannel[];
}): string {
  if (input.activeChannels.length === 0 && input.failedPendingChannels.length > 0) {
    return "Your node is reachable, but it is not currently payment-ready because no active channels were found and at least one recent channel opening attempt failed.";
  }

  if (input.activeChannels.length === 0 && input.pendingOpeningChannels.length > 0) {
    return "Your node is reachable, but it is not currently payment-ready because no active channels are usable yet and at least one channel opening attempt is still pending.";
  }

  if (input.activeChannels.length === 0) {
    return "Your node is reachable, but it is not currently payment-ready because no active channels were found.";
  }

  if (input.sendReadyChannels.length === 0) {
    return "Your node has active channels, but it may not be ready to send payments because no outbound liquidity was detected.";
  }

  if (input.receiveReadyChannels.length === 0) {
    return "Your node appears able to send payments, but it may not be ready to receive because no inbound liquidity was detected.";
  }

  if (input.pendingOpeningChannels.length > 0) {
    return "Your node appears to have at least one active channel with usable liquidity, and additional channel opening attempts are still pending.";
  }

  return "Your node appears to have at least one active channel with both outbound and inbound liquidity signals.";
}

function buildChannelSuggestions(input: {
  activeChannels: FiberChannel[];
  failedPendingChannels: FiberChannel[];
  pendingOpeningChannels: FiberChannel[];
  receiveReadyChannels: FiberChannel[];
  sendReadyChannels: FiberChannel[];
}): string[] {
  const suggestions: string[] = [];

  if (input.activeChannels.length === 0) {
    suggestions.push("Open a channel with a reachable peer.");
  }

  if (input.sendReadyChannels.length === 0) {
    suggestions.push("Fund or rebalance a channel before attempting to send payments.");
  }

  if (input.receiveReadyChannels.length === 0) {
    suggestions.push("Increase inbound liquidity if you want this node to receive payments.");
  }

  if (input.pendingOpeningChannels.length > 0) {
    suggestions.push("Monitor pending channel attempts until they either become active or expose a failure detail.");
  }

  if (input.failedPendingChannels.length > 0) {
    suggestions.push("Inspect the latest failed channel attempt and verify your CKB funding capacity.");
  }

  return suggestions;
}

function isActiveChannel(channel: FiberChannel): boolean {
  return channel.state?.state_name === "ChannelReady";
}

function isClosedChannel(channel: FiberChannel): boolean {
  return channel.state?.state_name === "Closed";
}

function hasOutboundLiquidity(channel: FiberChannel): boolean {
  try {
    return BigInt(channel.local_balance ?? "0x0") > 0n;
  } catch {
    return false;
  }
}

function hasInboundLiquidity(channel: FiberChannel): boolean {
  try {
    return BigInt(channel.remote_balance ?? "0x0") > 0n;
  } catch {
    return false;
  }
}
