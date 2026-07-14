import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaymentSummary,
  explainFiberInput,
} from "../src/diagnostics/payment-checks.js";

test("explains invalid invoice errors", () => {
  const result = explainFiberInput(
    'Bech32 error: missing human-readable separator, "1"',
  );

  assert.equal(result.category, "Invalid invoice");
  assert.match(result.diagnosis, /not a valid Fiber invoice/i);
  assert.equal(result.suggestions.length, 2);
});

test("explains expired invoice errors", () => {
  const result = explainFiberInput("Expired invoice");

  assert.equal(result.category, "Expired invoice");
  assert.match(result.diagnosis, /no longer valid/i);
});

test("prefers outbound liquidity explanation for failed payment fixtures", () => {
  const result = explainFiberInput({
    failed_error:
      "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000",
  });

  assert.equal(result.category, "Insufficient outbound liquidity");
  assert.match(result.diagnosis, /enough outbound liquidity/i);
});

test("explains channel funding failures", () => {
  const result = explainFiberInput({
    failure_detail: "Funding transaction aborted",
  });

  assert.equal(result.category, "Channel funding failed");
  assert.match(result.diagnosis, /funding transaction/i);
});

test("explains invoice not found errors", () => {
  const result = explainFiberInput({
    error: {
      code: -32000,
      message: "invoice not found",
    },
  });

  assert.equal(result.category, "Invoice not found");
  assert.match(result.diagnosis, /could not find an invoice/i);
});

test("explains no connected peers readiness blockers", () => {
  const result = explainFiberInput("No connected peers detected");

  assert.equal(result.category, "No peers connected");
  assert.match(result.diagnosis, /does not currently have any connected peers/i);
});

test("explains peer offline errors", () => {
  const result = explainFiberInput("Receiver is offline");

  assert.equal(result.category, "Peer offline");
  assert.match(result.diagnosis, /does not appear to be online/i);
});

test("explains no active channels readiness blockers", () => {
  const result = explainFiberInput("No active channels found");

  assert.equal(result.category, "No active channels");
  assert.match(result.diagnosis, /does not currently have any active channels/i);
});

test("explains channel not active errors", () => {
  const result = explainFiberInput("Channel not active");

  assert.equal(result.category, "Channel not active");
  assert.match(result.diagnosis, /not yet in an active state/i);
});

test("explains no outbound liquidity readiness blockers", () => {
  const result = explainFiberInput("No outbound liquidity detected");

  assert.equal(result.category, "No outbound liquidity");
  assert.match(result.diagnosis, /does not currently have spendable outbound liquidity/i);
});

test("explains no inbound liquidity readiness blockers", () => {
  const result = explainFiberInput("No inbound liquidity detected");

  assert.equal(result.category, "No inbound liquidity");
  assert.match(result.diagnosis, /does not currently have enough inbound liquidity/i);
});

test("explains rpc method unavailable errors", () => {
  const result = explainFiberInput({
    error: {
      code: -32601,
      message: "Method not found",
    },
  });

  assert.equal(result.category, "RPC method unavailable");
  assert.match(result.diagnosis, /does not appear to support the requested rpc method/i);
});

test("explains no route found errors", () => {
  const result = explainFiberInput("No route found");

  assert.equal(result.category, "No route found");
  assert.match(result.diagnosis, /could not find a usable payment route/i);
});

test("explains payment timeout errors", () => {
  const result = explainFiberInput("Payment timeout while waiting for completion");

  assert.equal(result.category, "Payment timeout");
  assert.match(result.diagnosis, /did not complete before its timeout window/i);
});

test("explains generic route build failures when liquidity is not explicit", () => {
  const result = explainFiberInput(
    "Send payment error: Failed to build route for the current graph",
  );

  assert.equal(result.category, "Route build failed");
  assert.match(result.diagnosis, /could not construct a valid route/i);
});

test("explains fee limit related errors", () => {
  const result = explainFiberInput(
    "Send payment error: fee limit exceeded because max fee is too low",
  );

  assert.equal(result.category, "Fee limit too low");
  assert.match(result.diagnosis, /allowed routing fee appears too restrictive/i);
});

test("explains insufficient ckb capacity errors", () => {
  const result = explainFiberInput(
    "Failed to build CKB tx: balance capacity error: capacity not enough: need more capacity, value=1000.00000274",
  );

  assert.equal(result.category, "Insufficient CKB funding capacity");
  assert.match(result.diagnosis, /does not currently have enough CKB capacity/i);
});

test("explains rpc unreachable errors", () => {
  const result = explainFiberInput(
    "Failed to reach Fiber RPC at http://127.0.0.1:9999",
  );

  assert.equal(result.category, "RPC unreachable");
  assert.match(result.diagnosis, /could not connect/i);
});

test("explains successful payment records", () => {
  const result = explainFiberInput({
    payment_hash: "0xabc",
    status: "Succeeded",
  });

  assert.equal(result.category, "Payment succeeded");
  assert.match(result.diagnosis, /completed successfully/i);
  assert.equal(result.suggestions.length, 2);
});

test("explains inflight payment records", () => {
  const result = explainFiberInput({
    payment_hash: "0xdef",
    status: "Inflight",
  });

  assert.equal(result.category, "Payment in flight");
  assert.match(result.diagnosis, /not reached a final failed or successful state/i);
  assert.equal(result.suggestions.length, 2);
});

test("explains a saved list_payments response by using the failed payment inside it", () => {
  const result = explainFiberInput({
    payments: [
      {
        failed_error:
          "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000",
        status: "Failed",
      },
    ],
  });

  assert.equal(result.category, "Insufficient outbound liquidity");
  assert.match(result.diagnosis, /enough outbound liquidity/i);
});

test("builds a payment summary from recent failed payments", () => {
  const summary = buildPaymentSummary([
    {
      failed_error:
        "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000",
      payment_hash: "0xabc",
      status: "Failed",
    },
  ]);

  assert.equal(summary.statusCounts.failed, 1);
  assert.equal(summary.statusCounts.succeeded, 0);
  assert.equal(summary.latestFailedExplanation?.category, "Insufficient outbound liquidity");
  assert.match(summary.diagnosis, /recent payment attempts include at least one failure/i);
  assert.deepEqual(summary.suggestions, [
    "Open and fund a channel before retrying the payment.",
    "Reduce the payment amount if you suspect capacity is too low.",
    "Rebalance liquidity if channels exist but cannot currently send.",
  ]);
});

test("builds a payment summary for successful recent payments", () => {
  const summary = buildPaymentSummary([
    {
      payment_hash: "0x333",
      status: "Succeeded",
    },
  ]);

  assert.equal(summary.statusCounts.succeeded, 1);
  assert.equal(summary.statusCounts.failed, 0);
  assert.equal(summary.latestFailedExplanation, null);
  assert.match(summary.diagnosis, /includes successful payments/i);
  assert.deepEqual(summary.suggestions, [
    "Use the successful payment history as a baseline when comparing later failures.",
  ]);
});

test("builds a payment summary for inflight recent payments", () => {
  const summary = buildPaymentSummary([
    {
      payment_hash: "0x444",
      status: "Inflight",
    },
  ]);

  assert.equal(summary.statusCounts.inflight, 1);
  assert.equal(summary.statusCounts.failed, 0);
  assert.match(summary.diagnosis, /at least one inflight payment/i);
});

test("falls back to unknown error when no known pattern matches", () => {
  const result = explainFiberInput("unexpected fiber problem");

  assert.equal(result.category, "Unknown error");
  assert.match(result.diagnosis, /could not confidently classify/i);
});
