import type { DiagnosticResult } from "./rules.js";
import type { FiberNodeInfo, FiberPeer } from "../fiber/types.js";
import { formatMaybeHexCount, inferNetworkLabel } from "../utils/format.js";

export type NodeSummary = {
  derivedNetwork: string;
  nodeInfo: FiberNodeInfo;
  nodeStatus: string;
  connectedPeerCount: number;
  diagnostics: DiagnosticResult[];
};

export function buildNodeSummary(input: {
  nodeInfo: FiberNodeInfo;
  peers: FiberPeer[];
}): NodeSummary {
  const connectedPeerCount = input.peers.length;
  const derivedNetwork = inferNetworkLabel(input.nodeInfo.chain_hash);
  const nodeStatus =
    connectedPeerCount > 0 ? "reachable and connected" : "reachable but not connected";

  const diagnostics: DiagnosticResult[] = [
    {
      status: "pass",
      title: "Fiber RPC reachable",
    },
    {
      status: "pass",
      title: "Node info fetched successfully",
    },
    input.nodeInfo.pubkey
      ? {
          status: "pass",
          title: "Node identity available",
          details: input.nodeInfo.pubkey,
        }
      : {
          status: "warn",
          title: "Node identity unavailable",
        },
    connectedPeerCount > 0
      ? {
          status: "pass",
          title: "Connected peers detected",
          details: `${connectedPeerCount} connected peer(s)`,
        }
      : {
          status: "warn",
          title: "No connected peers detected",
        },
    input.nodeInfo.peers_count
      ? {
          status: "pass",
          title: "Reported peer count available",
          details: formatMaybeHexCount(input.nodeInfo.peers_count),
        }
      : {
          status: "warn",
          title:
            "Could not fetch peer count. The Fiber RPC API may have changed or the method may not be enabled.",
        },
    input.nodeInfo.channel_count
      ? {
          status: "pass",
          title: "Reported channel count available",
          details: formatMaybeHexCount(input.nodeInfo.channel_count),
        }
      : {
          status: "warn",
          title:
            "Could not fetch channel count. The Fiber RPC API may have changed or the method may not be enabled.",
        },
  ];

  return {
    derivedNetwork,
    nodeInfo: input.nodeInfo,
    nodeStatus,
    connectedPeerCount,
    diagnostics,
  };
}
