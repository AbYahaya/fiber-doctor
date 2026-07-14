import { buildChannelSummary } from "../../src/diagnostics/channel-checks";
import { buildNodeSummary, type NodeSummary } from "../../src/diagnostics/node-checks";
import {
  buildPaymentSummary,
  explainFiberInput,
} from "../../src/diagnostics/payment-checks";
import { buildReportSummary } from "../../src/diagnostics/report-checks";
import { loadConfig } from "../../src/config/load-config";
import {
  getNodeInfo,
  listChannels,
  listPayments,
  listPeers,
} from "../../src/fiber/rpc-methods";
import { FiberRpcClient } from "../../src/fiber/rpc-client";
import { FiberConfigError, FiberDoctorError, FiberNetworkError, FiberResponseParseError, FiberRpcError } from "../../src/utils/errors";
import { formatMaybeHexCount } from "../../src/utils/format";
import type { FiberChannel, FiberNodeInfo, FiberPayment, FiberPeer } from "../../src/fiber/types";

type RuntimeRequest = {
  configPath?: string;
  fixture?: Record<string, unknown>;
  rpcUrl?: string;
};

type RuntimeError = {
  error: {
    message: string;
    name: string;
    code?: number;
    details?: unknown;
  };
};

function resolveRpcUrl(input: RuntimeRequest): string {
  return loadConfig({ configPath: input.configPath, rpcUrl: input.rpcUrl }).rpcUrl;
}

function serializeError(error: unknown): RuntimeError {
  if (error instanceof FiberRpcError) {
    return {
      error: {
        code: error.code,
        details: error.data,
        message: error.message,
        name: error.name,
      },
    };
  }

  if (
    error instanceof FiberNetworkError ||
    error instanceof FiberResponseParseError ||
    error instanceof FiberConfigError ||
    error instanceof FiberDoctorError
  ) {
    return {
      error: {
        message: error.message,
        name: error.name,
      },
    };
  }

  return {
    error: {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Error",
    },
  };
}

function buildCheckResponse(input: {
  nodeInfo: FiberNodeInfo;
  peers: FiberPeer[];
  rpcUrl: string;
}): ReturnType<typeof toCheckPayload> {
  const summary = buildNodeSummary({ nodeInfo: input.nodeInfo, peers: input.peers });
  return toCheckPayload(summary, input.rpcUrl);
}

function toCheckPayload(summary: NodeSummary, rpcUrl: string) {
  return {
    diagnostics: summary.diagnostics,
    node: {
      chainHash: summary.nodeInfo.chain_hash,
      connectedPeers: summary.connectedPeerCount,
      network: summary.derivedNetwork,
      pubkey: summary.nodeInfo.pubkey,
      reportedChannelCount: formatMaybeHexCount(summary.nodeInfo.channel_count),
      reportedPeerCount: formatMaybeHexCount(summary.nodeInfo.peers_count),
      status: summary.nodeStatus,
      version: summary.nodeInfo.version,
    },
    rpcUrl,
  };
}

function buildChannelsResponse(input: {
  allChannels: FiberChannel[];
  pendingOrFailedChannels: FiberChannel[];
  rpcUrl: string;
}) {
  const summary = buildChannelSummary({
    allChannels: input.allChannels,
    pendingOrFailedChannels: input.pendingOrFailedChannels,
  });

  return {
    channels: {
      active: summary.activeChannels.length,
      closed: summary.closedChannels.length,
      pending: summary.pendingOpeningChannels.length,
      pendingOpening: summary.pendingOpeningChannels.length,
      pendingOrFailed: summary.pendingOrFailedChannels.length,
      receiveReady: summary.receiveReadyChannels.length,
      sendReady: summary.sendReadyChannels.length,
      total: summary.allChannels.length,
      totalCapacity: summary.totalCapacity,
      totalLocalBalance: summary.totalLocalBalance,
      totalRemoteBalance: summary.totalRemoteBalance,
    },
    diagnosis: summary.diagnosis,
    diagnostics: summary.diagnostics,
    latestFailedAttempt: summary.failedPendingChannels[0] ?? null,
    latestPendingAttempt: summary.pendingOpeningChannels[0] ?? null,
    rpcUrl: input.rpcUrl,
    suggestions: summary.suggestions,
  };
}

function buildReportResponse(input: {
  allChannels: FiberChannel[];
  nodeInfo: FiberNodeInfo;
  payments: FiberPayment[];
  peers: FiberPeer[];
  pendingOrFailedChannels: FiberChannel[];
  rpcUrl: string;
}) {
  const nodeSummary = buildNodeSummary({ nodeInfo: input.nodeInfo, peers: input.peers });
  const channelSummary = buildChannelSummary({
    allChannels: input.allChannels,
    pendingOrFailedChannels: input.pendingOrFailedChannels,
  });
  const paymentSummary = buildPaymentSummary(input.payments);
  const reportSummary = buildReportSummary({
    channelSummary,
    nodeSummary,
    paymentSummary,
  });

  return {
    blockers: reportSummary.blockers,
    channels: {
      active: channelSummary.activeChannels.length,
      closed: channelSummary.closedChannels.length,
      pending: channelSummary.pendingOpeningChannels.length,
      pendingOpening: channelSummary.pendingOpeningChannels.length,
      pendingOrFailed: channelSummary.pendingOrFailedChannels.length,
      receiveReady: channelSummary.receiveReadyChannels.length,
      sendReady: channelSummary.sendReadyChannels.length,
      total: channelSummary.allChannels.length,
      totalCapacity: channelSummary.totalCapacity,
      totalLocalBalance: channelSummary.totalLocalBalance,
      totalRemoteBalance: channelSummary.totalRemoteBalance,
    },
    diagnosis: reportSummary.diagnosis,
    diagnostics: [...nodeSummary.diagnostics, ...channelSummary.diagnostics, ...paymentSummary.diagnostics],
    node: {
      chainHash: nodeSummary.nodeInfo.chain_hash,
      connectedPeers: nodeSummary.connectedPeerCount,
      network: nodeSummary.derivedNetwork,
      pubkey: nodeSummary.nodeInfo.pubkey,
      reportedChannelCount: formatMaybeHexCount(nodeSummary.nodeInfo.channel_count),
      reportedPeerCount: formatMaybeHexCount(nodeSummary.nodeInfo.peers_count),
      status: nodeSummary.nodeStatus,
      version: nodeSummary.nodeInfo.version,
    },
    payments: {
      failed: paymentSummary.statusCounts.failed,
      inflight: paymentSummary.statusCounts.inflight,
      succeeded: paymentSummary.statusCounts.succeeded,
      total: paymentSummary.payments.length,
      unknown: paymentSummary.statusCounts.unknown,
    },
    readiness: {
      overallHealth: reportSummary.overallHealth,
      receive: reportSummary.receiveReadiness,
      send: reportSummary.sendReadiness,
    },
    rpcUrl: input.rpcUrl,
    suggestions: reportSummary.suggestions,
  };
}

export async function getCheckResponse(input: RuntimeRequest) {
  if (input.fixture) {
    return buildCheckResponse({
      nodeInfo: (input.fixture.nodeInfo as FiberNodeInfo) ?? {},
      peers: ((input.fixture.peers as FiberPeer[]) ?? []).filter(Boolean),
      rpcUrl: input.rpcUrl ?? "fixture://check",
    });
  }

  const rpcUrl = resolveRpcUrl(input);
  const client = new FiberRpcClient(rpcUrl);
  return buildCheckResponse({
    nodeInfo: await getNodeInfo(client),
    peers: (await listPeers(client)).peers ?? [],
    rpcUrl,
  });
}

export async function getChannelsResponse(input: RuntimeRequest) {
  if (input.fixture) {
    return buildChannelsResponse({
      allChannels: (input.fixture.allChannels as FiberChannel[]) ?? [],
      pendingOrFailedChannels: (input.fixture.pendingOrFailedChannels as FiberChannel[]) ?? [],
      rpcUrl: input.rpcUrl ?? "fixture://channels",
    });
  }

  const rpcUrl = resolveRpcUrl(input);
  const client = new FiberRpcClient(rpcUrl);
  return buildChannelsResponse({
    allChannels: (await listChannels(client)).channels ?? [],
    pendingOrFailedChannels: (await listChannels(client, { onlyPending: true })).channels ?? [],
    rpcUrl,
  });
}

export async function getReportResponse(input: RuntimeRequest) {
  if (input.fixture) {
    return buildReportResponse({
      allChannels: (input.fixture.allChannels as FiberChannel[]) ?? [],
      nodeInfo: (input.fixture.nodeInfo as FiberNodeInfo) ?? {},
      payments: (input.fixture.payments as FiberPayment[]) ?? [],
      peers: ((input.fixture.peers as FiberPeer[]) ?? []).filter(Boolean),
      pendingOrFailedChannels: (input.fixture.pendingOrFailedChannels as FiberChannel[]) ?? [],
      rpcUrl: input.rpcUrl ?? "fixture://report",
    });
  }

  const rpcUrl = resolveRpcUrl(input);
  const client = new FiberRpcClient(rpcUrl);
  return buildReportResponse({
    allChannels: (await listChannels(client)).channels ?? [],
    nodeInfo: await getNodeInfo(client),
    payments: (await listPayments(client)).payments ?? [],
    peers: (await listPeers(client)).peers ?? [],
    pendingOrFailedChannels: (await listChannels(client, { onlyPending: true })).channels ?? [],
    rpcUrl,
  });
}

export function getExplainResponse(input: unknown) {
  return explainFiberInput(input as string | Record<string, unknown>);
}

export function renderErrorResponse(error: unknown, status = 500) {
  return Response.json(serializeError(error), { status });
}
