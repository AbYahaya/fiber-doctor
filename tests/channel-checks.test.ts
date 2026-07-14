import test from "node:test";
import assert from "node:assert/strict";

import { buildChannelSummary } from "../src/diagnostics/channel-checks.js";

test("diagnoses failed channel attempts when there are no active channels", () => {
  const summary = buildChannelSummary({
    allChannels: [],
    pendingOrFailedChannels: [
      {
        failure_detail: "Funding transaction aborted",
        pubkey: "0313dcf9",
        state: {
          state_flags: "FUNDING_ABORTED",
          state_name: "Closed",
        },
      },
    ],
  });

  assert.equal(summary.activeChannels.length, 0);
  assert.equal(summary.failedPendingChannels.length, 1);
  assert.match(summary.diagnosis, /not currently payment-ready/i);
  assert.ok(
    summary.suggestions.includes(
      "Inspect the latest failed channel attempt and verify your CKB funding capacity.",
    ),
  );
});

test("diagnoses pending channel attempts when there are no active channels yet", () => {
  const summary = buildChannelSummary({
    allChannels: [],
    pendingOrFailedChannels: [
      {
        pubkey: "02pendingpeer",
        state: {
          state_flags: "AWAITING_FUNDING",
          state_name: "NegotiatingFunding",
        },
      },
    ],
  });

  assert.equal(summary.pendingOpeningChannels.length, 1);
  assert.equal(summary.failedPendingChannels.length, 0);
  assert.match(summary.diagnosis, /channel opening attempt is still pending/i);
  assert.ok(
    summary.suggestions.includes(
      "Monitor pending channel attempts until they either become active or expose a failure detail.",
    ),
  );
});

test("detects send and receive readiness for active channels with balances", () => {
  const summary = buildChannelSummary({
    allChannels: [
      {
        local_balance: "0x64",
        remote_balance: "0x32",
        state: {
          state_name: "ChannelReady",
        },
      },
    ],
    pendingOrFailedChannels: [],
  });

  assert.equal(summary.activeChannels.length, 1);
  assert.equal(summary.sendReadyChannels.length, 1);
  assert.equal(summary.receiveReadyChannels.length, 1);
  assert.match(summary.diagnosis, /both outbound and inbound liquidity/i);
});

test("diagnoses no outbound liquidity when active channels exist but local balance is zero", () => {
  const summary = buildChannelSummary({
    allChannels: [
      {
        local_balance: "0x0",
        remote_balance: "0x32",
        state: {
          state_name: "ChannelReady",
        },
      },
    ],
    pendingOrFailedChannels: [],
  });

  assert.equal(summary.activeChannels.length, 1);
  assert.equal(summary.sendReadyChannels.length, 0);
  assert.equal(summary.receiveReadyChannels.length, 1);
  assert.match(summary.diagnosis, /may not be ready to send payments/i);
  assert.ok(
    summary.suggestions.includes(
      "Fund or rebalance a channel before attempting to send payments.",
    ),
  );
});

test("diagnoses no inbound liquidity when active channels exist but remote balance is zero", () => {
  const summary = buildChannelSummary({
    allChannels: [
      {
        local_balance: "0x64",
        remote_balance: "0x0",
        state: {
          state_name: "ChannelReady",
        },
      },
    ],
    pendingOrFailedChannels: [],
  });

  assert.equal(summary.activeChannels.length, 1);
  assert.equal(summary.sendReadyChannels.length, 1);
  assert.equal(summary.receiveReadyChannels.length, 0);
  assert.match(summary.diagnosis, /may not be ready to receive/i);
  assert.ok(
    summary.suggestions.includes(
      "Increase inbound liquidity if you want this node to receive payments.",
    ),
  );
});

test("mentions pending openings even when an active channel already exists", () => {
  const summary = buildChannelSummary({
    allChannels: [
      {
        local_balance: "0x64",
        remote_balance: "0x32",
        state: {
          state_name: "ChannelReady",
        },
      },
    ],
    pendingOrFailedChannels: [
      {
        pubkey: "02pendingpeer",
        state: {
          state_flags: "AWAITING_FUNDING",
          state_name: "NegotiatingFunding",
        },
      },
    ],
  });

  assert.equal(summary.activeChannels.length, 1);
  assert.equal(summary.pendingOpeningChannels.length, 1);
  assert.match(summary.diagnosis, /additional channel opening attempts are still pending/i);
});
