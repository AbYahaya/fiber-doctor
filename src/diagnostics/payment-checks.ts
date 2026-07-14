import type { FiberPayment } from "../fiber/types.js";
import type { DiagnosticResult } from "./rules.js";

export type Explanation = {
  category: string;
  diagnosis: string;
  rawError: string;
  suggestions: string[];
};

export type PaymentSummary = {
  diagnostics: DiagnosticResult[];
  diagnosis: string;
  failedPayments: FiberPayment[];
  latestFailedExplanation: Explanation | null;
  payments: FiberPayment[];
  statusCounts: {
    failed: number;
    inflight: number;
    succeeded: number;
    unknown: number;
  };
  suggestions: string[];
};

export function explainFiberInput(input: string | Record<string, unknown>): Explanation {
  const paymentStateExplanation = explainPaymentState(input);
  if (paymentStateExplanation) {
    return paymentStateExplanation;
  }

  const normalized = normalizeExplanationInput(input);
  return explainFiberError(normalized);
}

function explainPaymentState(
  input: string | Record<string, unknown>,
): Explanation | null {
  if (typeof input === "string") {
    return null;
  }

  const paymentsValue = input.payments;
  if (Array.isArray(paymentsValue) && paymentsValue.length > 0) {
    const firstPayment = paymentsValue.find(
      (payment): payment is Record<string, unknown> =>
        Boolean(payment && typeof payment === "object"),
    );

    if (firstPayment) {
      return explainPaymentState(firstPayment);
    }
  }

  const status = typeof input.status === "string" ? input.status : undefined;
  const normalizedStatus = normalizePaymentStatus(status);
  const hasFailureText =
    typeof input.failed_error === "string" || typeof input.failure_detail === "string";

  if (hasFailureText || normalizedStatus === "unknown") {
    return null;
  }

  if (normalizedStatus === "inflight") {
    return {
      category: "Payment in flight",
      rawError: status ?? "Payment status is still pending",
      diagnosis:
        "The payment has not reached a final failed or successful state yet, so the node is still attempting or waiting for resolution.",
      suggestions: [
        "Check the payment again after a short delay to see whether it succeeds or fails.",
        "Use `get_payment` or `list_payments` to confirm whether the status changes.",
      ],
    };
  }

  if (normalizedStatus === "succeeded") {
    return {
      category: "Payment succeeded",
      rawError: status ?? "Payment completed successfully",
      diagnosis:
        "The saved payment record indicates that this payment completed successfully, so it is useful as a baseline for comparing later failures.",
      suggestions: [
        "Compare this successful payment against failing ones to spot amount, route, or liquidity differences.",
        "Use this record as evidence that the node has recently completed a payment flow.",
      ],
    };
  }

  return null;
}

function normalizeExplanationInput(input: string | Record<string, unknown>): string {
  if (typeof input === "string") {
    return input;
  }

  const paymentsValue = input.payments;
  if (Array.isArray(paymentsValue)) {
    const firstFailedPayment = paymentsValue.find(
      (payment): payment is Record<string, unknown> =>
        Boolean(
          payment &&
            typeof payment === "object" &&
            (typeof payment.failed_error === "string" ||
              typeof payment.failure_detail === "string"),
        ),
    );

    if (firstFailedPayment) {
      return normalizeExplanationInput(firstFailedPayment);
    }
  }

  if (typeof input.failed_error === "string") {
    return input.failed_error;
  }

  if (typeof input.failure_detail === "string") {
    return input.failure_detail;
  }

  const errorValue = input.error;
  if (typeof errorValue === "string") {
    return errorValue;
  }

  if (
    errorValue &&
    typeof errorValue === "object" &&
    "message" in errorValue &&
    typeof errorValue.message === "string"
  ) {
    return errorValue.message;
  }

  return JSON.stringify(input, null, 2);
}

export function buildPaymentSummary(payments: FiberPayment[]): PaymentSummary {
  const failedPayments = payments.filter(
    (payment) =>
      normalizePaymentStatus(payment.status) === "failed" ||
      typeof payment.failed_error === "string",
  );
  const inflightPayments = payments.filter(
    (payment) => normalizePaymentStatus(payment.status) === "inflight",
  );
  const succeededPayments = payments.filter(
    (payment) => normalizePaymentStatus(payment.status) === "succeeded",
  );
  const unknownPayments = payments.filter(
    (payment) => normalizePaymentStatus(payment.status) === "unknown",
  );
  const latestFailedExplanation = failedPayments[0]
    ? explainFiberInput(failedPayments[0] as Record<string, unknown>)
    : null;

  return {
    diagnostics: buildPaymentDiagnostics({
      failedPayments,
      inflightPayments,
      payments,
      succeededPayments,
    }),
    diagnosis: buildPaymentDiagnosis({
      failedPayments,
      inflightPayments,
      latestFailedExplanation,
      payments,
      succeededPayments,
    }),
    failedPayments,
    latestFailedExplanation,
    payments,
    statusCounts: {
      failed: failedPayments.length,
      inflight: inflightPayments.length,
      succeeded: succeededPayments.length,
      unknown: unknownPayments.length,
    },
    suggestions: buildPaymentSuggestions({
      failedPayments,
      latestFailedExplanation,
      succeededPayments,
    }),
  };
}

function buildPaymentDiagnostics(input: {
  failedPayments: FiberPayment[];
  inflightPayments: FiberPayment[];
  payments: FiberPayment[];
  succeededPayments: FiberPayment[];
}): DiagnosticResult[] {
  return [
    input.payments.length > 0
      ? {
          status: "pass",
          title: "Recent payment history available",
          details: `${input.payments.length} payment record(s) returned`,
        }
      : {
          status: "warn",
          title: "No recent payment history returned",
        },
    input.failedPayments.length > 0
      ? {
          status: "warn",
          title: "Recent failed payments detected",
          details:
            input.failedPayments[0]?.failed_error ??
            input.failedPayments[0]?.status ??
            "unknown payment failure",
        }
      : {
          status: "pass",
          title: "No recent failed payments detected",
        },
    input.inflightPayments.length > 0
      ? {
          status: "warn",
          title: "Payments currently in flight",
          details: `${input.inflightPayments.length} inflight payment(s) detected`,
        }
      : {
          status: "pass",
          title: "No inflight payments detected",
        },
    input.succeededPayments.length > 0
      ? {
          status: "pass",
          title: "Completed payments found",
          details: `${input.succeededPayments.length} succeeded payment(s) detected`,
        }
      : {
          status: "warn",
          title: "No completed payments found in the recent sample",
        },
  ];
}

function buildPaymentDiagnosis(input: {
  failedPayments: FiberPayment[];
  inflightPayments: FiberPayment[];
  latestFailedExplanation: Explanation | null;
  payments: FiberPayment[];
  succeededPayments: FiberPayment[];
}): string {
  if (input.failedPayments.length > 0 && input.latestFailedExplanation) {
    return `Recent payment attempts include at least one failure classified as ${input.latestFailedExplanation.category.toLowerCase()}. ${input.latestFailedExplanation.diagnosis}`;
  }

  if (input.inflightPayments.length > 0) {
    return "Recent payment history shows at least one inflight payment, so payment activity is ongoing but final outcomes may still change.";
  }

  if (input.succeededPayments.length > 0) {
    return "Recent payment history includes successful payments, which is a good sign that the node has recently been able to route or receive payments.";
  }

  if (input.payments.length === 0) {
    return "No recent payment records were returned, so payment readiness still needs to be inferred mainly from peers, channels, and liquidity.";
  }

  return "Recent payment history was returned, but it did not contain enough detail for a stronger diagnosis.";
}

function buildPaymentSuggestions(input: {
  failedPayments: FiberPayment[];
  latestFailedExplanation: Explanation | null;
  succeededPayments: FiberPayment[];
}): string[] {
  if (input.failedPayments.length > 0 && input.latestFailedExplanation) {
    return input.latestFailedExplanation.suggestions;
  }

  if (input.succeededPayments.length > 0) {
    return [
      "Use the successful payment history as a baseline when comparing later failures.",
    ];
  }

  return [
    "Capture a failed payment fixture when one occurs so the report can correlate channel readiness with payment outcomes.",
  ];
}

function normalizePaymentStatus(status: string | undefined): "failed" | "inflight" | "succeeded" | "unknown" {
  const normalized = status?.toLowerCase();

  if (normalized === "failed") {
    return "failed";
  }

  if (normalized === "success" || normalized === "succeeded") {
    return "succeeded";
  }

  if (
    normalized === "pending" ||
    normalized === "created" ||
    normalized === "initiated" ||
    normalized === "inflight" ||
    normalized === "in_flight"
  ) {
    return "inflight";
  }

  return "unknown";
}

function explainFiberError(rawError: string): Explanation {
  const message = rawError.toLowerCase();

  if (message.includes("bech32 error")) {
    return {
      category: "Invalid invoice",
      rawError,
      diagnosis:
        "The supplied invoice string is not a valid Fiber invoice encoding, so the node cannot parse it.",
      suggestions: [
        "Check that the invoice was copied fully with no missing characters.",
        "Generate a fresh invoice if the current one may be malformed.",
      ],
    };
  }

  if (message.includes("invoice expired") || message.includes("expired invoice")) {
    return {
      category: "Expired invoice",
      rawError,
      diagnosis:
        "The invoice is no longer valid because its expiry window has already passed.",
      suggestions: [
        "Generate a fresh invoice and retry the payment.",
        "Check whether there was too much delay between invoice creation and payment attempt.",
      ],
    };
  }

  if (message.includes("invoice not found")) {
    return {
      category: "Invoice not found",
      rawError,
      diagnosis:
        "The node could not find an invoice matching the supplied payment hash or identifier.",
      suggestions: [
        "Verify that the payment hash belongs to an invoice known by this node.",
        "Check whether you are querying the correct node or environment.",
      ],
    };
  }

  if (message.includes("no connected peers")) {
    return {
      category: "No peers connected",
      rawError,
      diagnosis:
        "The node does not currently have any connected peers, so routing and channel coordination will be limited or unavailable.",
      suggestions: [
        "Connect the node to one or more reachable Fiber peers.",
        "Verify peer addresses and basic network reachability before retrying node operations.",
      ],
    };
  }

  if (
    message.includes("peer offline") ||
    message.includes("receiver is offline") ||
    message.includes("target peer offline")
  ) {
    return {
      category: "Peer offline",
      rawError,
      diagnosis:
        "The target peer or receiver does not appear to be online and reachable right now, so routing or direct delivery cannot complete.",
      suggestions: [
        "Check the receiver node status and confirm it is online.",
        "Retry later after the peer reconnects.",
      ],
    };
  }

  if (message.includes("no active channels")) {
    return {
      category: "No active channels",
      rawError,
      diagnosis:
        "The node does not currently have any active channels that are usable for payment traffic.",
      suggestions: [
        "Open a channel with a reachable peer and wait for it to become active.",
        "Inspect pending or failed channel attempts if you expected a channel to be ready already.",
      ],
    };
  }

  if (message.includes("channel not active") || message.includes("channel is not ready")) {
    return {
      category: "Channel not active",
      rawError,
      diagnosis:
        "A required channel exists but is not yet in an active state that can carry payments.",
      suggestions: [
        "Wait for the channel to become active before retrying the payment.",
        "Inspect pending or failed channel state if the channel should already be ready.",
      ],
    };
  }

  if (message.includes("no outbound liquidity")) {
    return {
      category: "No outbound liquidity",
      rawError,
      diagnosis:
        "The node may have channels, but it does not currently have spendable outbound liquidity for sending payments.",
      suggestions: [
        "Fund or rebalance a channel before retrying the payment.",
        "Reduce the payment amount if you suspect capacity is too low.",
      ],
    };
  }

  if (message.includes("no inbound liquidity")) {
    return {
      category: "No inbound liquidity",
      rawError,
      diagnosis:
        "The node may be able to send, but it does not currently have enough inbound liquidity to reliably receive payments.",
      suggestions: [
        "Increase inbound liquidity if you want the node to receive payments.",
        "Ask a peer to open a channel toward this node or rebalance existing channels.",
      ],
    };
  }

  if (
    message.includes("method not found") ||
    message.includes("rpc method unavailable") ||
    message.includes("unknown method")
  ) {
    return {
      category: "RPC method unavailable",
      rawError,
      diagnosis:
        "The connected Fiber node does not appear to support the requested RPC method, or the method name is not valid for this node version.",
      suggestions: [
        "Check whether the Fiber node version supports this RPC method.",
        "Verify the method name and request shape if you are replaying saved RPC data.",
        "Compare the node version and RPC surface against the docs or release notes you are targeting.",
      ],
    };
  }

  if (
    message.includes("insufficient balance") ||
    message.includes("max outbound liquidity 0 is insufficient")
  ) {
    return {
      category: "Insufficient outbound liquidity",
      rawError,
      diagnosis:
        "The node could not build a route because it does not currently have enough outbound liquidity to send the requested payment.",
      suggestions: [
        "Open and fund a channel before retrying the payment.",
        "Reduce the payment amount if you suspect capacity is too low.",
        "Rebalance liquidity if channels exist but cannot currently send.",
      ],
    };
  }

  if (message.includes("no route found")) {
    return {
      category: "No route found",
      rawError,
      diagnosis:
        "The node could not find a usable payment route from sender to receiver.",
      suggestions: [
        "Check whether the receiver is online and reachable.",
        "Verify that a path exists through the current channel graph.",
        "Retry with a lower amount in case route liquidity is the limiting factor.",
      ],
    };
  }

  if (message.includes("payment timeout") || message.includes("timed out")) {
    return {
      category: "Payment timeout",
      rawError,
      diagnosis:
        "The payment did not complete before its timeout window elapsed, so the attempt was abandoned or failed.",
      suggestions: [
        "Retry the payment and monitor whether route discovery or peer availability is slow.",
        "Check whether liquidity or peer connectivity caused the payment to stall.",
      ],
    };
  }

  if (message.includes("failed to build route")) {
    return {
      category: "Route build failed",
      rawError,
      diagnosis:
        "The node could not construct a valid route for this payment with the current graph and liquidity information.",
      suggestions: [
        "Inspect liquidity and channel readiness before retrying the payment.",
        "Reduce the amount or retry after opening/funding a channel.",
        "Check whether route constraints like fees or hop availability are too restrictive.",
      ],
    };
  }

  if (message.includes("fee limit") || message.includes("max fee")) {
    return {
      category: "Fee limit too low",
      rawError,
      diagnosis:
        "The payment could not proceed because the allowed routing fee appears too restrictive for the available path.",
      suggestions: [
        "Increase the fee limit or max fee setting and retry.",
        "Retry with a lower amount if the route cost is being driven by payment size.",
      ],
    };
  }

  if (message.includes("funding transaction aborted")) {
    return {
      category: "Channel funding failed",
      rawError,
      diagnosis:
        "A channel opening attempt was started, but the funding transaction could not complete successfully.",
      suggestions: [
        "Verify the node has enough CKB capacity to fund the channel and fees.",
        "Inspect recent node logs for the exact CKB funding failure.",
        "Retry the channel open after confirming wallet funding is available.",
      ],
    };
  }

  if (message.includes("capacity not enough") || message.includes("need more capacity")) {
    return {
      category: "Insufficient CKB funding capacity",
      rawError,
      diagnosis:
        "The node does not currently have enough CKB capacity to fund the requested channel operation and its fees.",
      suggestions: [
        "Fund the node wallet with more CKB before retrying the channel operation.",
        "Reduce the requested channel funding amount if appropriate.",
        "Review recent node logs to confirm the exact funding shortfall.",
      ],
    };
  }

  if (message.includes("failed to reach fiber rpc") || message.includes("econnrefused")) {
    return {
      category: "RPC unreachable",
      rawError,
      diagnosis:
        "Fiber Doctor could not connect to the configured Fiber RPC endpoint.",
      suggestions: [
        "Start the Fiber node if it is not running.",
        "Verify the RPC URL, host, and port.",
        "Confirm the RPC port is exposed and reachable from this machine.",
      ],
    };
  }

  return {
    category: "Unknown error",
    rawError,
    diagnosis:
      "Fiber Doctor could not confidently classify this error yet, but the raw message has been preserved for manual inspection.",
    suggestions: [
      "Inspect the raw error text and recent Fiber logs together.",
      "Save this error as a fixture so the explainer can learn this pattern later.",
    ],
  };
}
