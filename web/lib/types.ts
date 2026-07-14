export type DiagnosticStatus = "pass" | "warn" | "fail";

export type DiagnosticResult = {
  details?: string;
  status: DiagnosticStatus;
  suggestions?: string[];
  title: string;
};

export type CheckResult = {
  diagnostics: DiagnosticResult[];
  node: {
    chainHash?: string;
    connectedPeers: number;
    network: string;
    pubkey?: string;
    reportedChannelCount: string;
    reportedPeerCount: string;
    status: string;
    version?: string;
  };
  rpcUrl: string;
};

export type ChannelsResult = {
  channels: {
    active: number;
    closed: number;
    pending: number;
    pendingOpening: number;
    pendingOrFailed: number;
    receiveReady: number;
    sendReady: number;
    total: number;
    totalCapacity: string;
    totalLocalBalance: string;
    totalRemoteBalance: string;
  };
  diagnosis: string;
  diagnostics: DiagnosticResult[];
  latestFailedAttempt: unknown;
  latestPendingAttempt: unknown;
  rpcUrl: string;
  suggestions: string[];
};

export type ReportResult = {
  blockers: string[];
  channels: ChannelsResult["channels"];
  diagnosis: string;
  diagnostics: DiagnosticResult[];
  node: CheckResult["node"];
  payments: {
    failed: number;
    inflight: number;
    succeeded: number;
    total: number;
    unknown: number;
  };
  readiness: {
    overallHealth: "ready" | "degraded" | "blocked";
    receive: "ready" | "degraded" | "blocked";
    send: "ready" | "degraded" | "blocked";
  };
  rpcUrl: string;
  suggestions: string[];
};

export type ExplainResult = {
  category: string;
  diagnosis: string;
  rawError: string;
  suggestions: string[];
};

export type TabKey = "check" | "channels" | "report" | "explain";