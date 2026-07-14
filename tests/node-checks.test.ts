import test from "node:test";
import assert from "node:assert/strict";

import { buildNodeSummary } from "../src/diagnostics/node-checks.js";

test("builds a passing node summary when identity and peers are present", () => {
  const summary = buildNodeSummary({
    nodeInfo: {
      chain_hash: "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606",
      pubkey: "0310abc",
      version: "0.9.0-rc7",
    },
    peers: [{ pubkey: "peer-1" }, { pubkey: "peer-2" }],
  });

  assert.equal(summary.connectedPeerCount, 2);
  assert.equal(summary.derivedNetwork, "Fiber testnet");
  assert.equal(summary.nodeStatus, "reachable and connected");
  assert.equal(summary.diagnostics[2]?.status, "pass");
  assert.equal(summary.diagnostics[3]?.status, "pass");
});

test("warns when identity and peers are missing", () => {
  const summary = buildNodeSummary({
    nodeInfo: {},
    peers: [],
  });

  assert.equal(summary.connectedPeerCount, 0);
  assert.equal(summary.nodeStatus, "reachable but not connected");
  assert.equal(summary.diagnostics[2]?.status, "warn");
  assert.equal(summary.diagnostics[3]?.status, "warn");
  assert.equal(summary.diagnostics[4]?.status, "warn");
  assert.equal(summary.diagnostics[5]?.status, "warn");
});
