import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cliPath = resolve(
  "/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor/dist/cli.js",
);
const projectDir = resolve("/home/abyahaya/CKBBuilder/ckbuilders/fiber-doctor");

function runCli(args: string[]): { output: string; status: number | null } {
  const escapedArgs = args.map(shellEscape).join(" ");
  const outputPath = "/tmp/fiber-doctor-cli-smoke-output.txt";
  const command = `node ${shellEscape(cliPath)} ${escapedArgs} > ${outputPath} 2>&1; status=$?; cat ${outputPath}; exit $status`;

  const result = spawnSync("bash", ["-lc", command], {
    cwd: projectDir,
    encoding: "utf8",
  });

  return {
    output: result.stdout,
    status: result.status,
  };
}

function shellEscape(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

test("cli help output includes the implemented commands", () => {
  const result = runCli(["--help"]);

  assert.equal(result.status, 0);
  assert.match(result.output, /check \[options]/i);
  assert.match(result.output, /channels \[options]/i);
  assert.match(result.output, /explain \[options] <input>/i);
  assert.match(result.output, /report \[options]/i);
});

test("explain command works with a fixture file", () => {
  const result = runCli(["explain", "./examples/failed-payment.json"]);

  assert.equal(result.status, 0);
  assert.match(result.output, /Payment Failure Explanation/);
  assert.match(result.output, /Insufficient outbound liquidity/);
});

test("explain command supports json mode", () => {
  const result = runCli([
    "explain",
    "./examples/failed-channel.json",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "Channel funding failed"/);
  assert.match(result.output, /"rawError": "Funding transaction aborted"/);
});

test("explain command understands a saved list_payments response", () => {
  const result = runCli([
    "explain",
    "./examples/list-payments.json",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "Insufficient outbound liquidity"/);
  assert.match(result.output, /"rawError": "Send payment error: Failed to build route/);
});

test("explain command understands a saved successful payment fixture", () => {
  const result = runCli([
    "explain",
    "./examples/payment-succeeded.json",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "Payment succeeded"/);
});

test("explain command understands a saved inflight payment fixture", () => {
  const result = runCli([
    "explain",
    "./examples/payment-inflight.json",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "Payment in flight"/);
});

test("explain command understands a saved method-not-found rpc error", () => {
  const result = runCli([
    "explain",
    "./examples/method-not-found.json",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "RPC method unavailable"/);
});

test("explain command understands a saved no-peers blocker", () => {
  const result = runCli([
    "explain",
    "./examples/no-peers.txt",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "No peers connected"/);
});

test("explain command understands a saved no-active-channels blocker", () => {
  const result = runCli([
    "explain",
    "./examples/no-active-channels.txt",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "No active channels"/);
});

test("explain command understands a saved expired invoice", () => {
  const result = runCli([
    "explain",
    "./examples/expired-invoice.txt",
    "--json",
  ]);

  assert.equal(result.status, 0);
  assert.match(result.output, /"category": "Expired invoice"/);
});

test("check command verbose mode still reports unreachable rpc cleanly", () => {
  const result = runCli(["check", "--rpc", "http://127.0.0.1:9999", "--verbose"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /Fiber RPC unreachable/);
});

test("channels command reports unreachable rpc cleanly", () => {
  const result = runCli(["channels", "--rpc", "http://127.0.0.1:9999"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /Could not inspect channels because Fiber RPC is unreachable/);
});

test("report command reports unreachable rpc cleanly", () => {
  const result = runCli(["report", "--rpc", "http://127.0.0.1:9999"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /Could not generate report because Fiber RPC is unreachable/);
});

test("check command reports unreachable rpc cleanly", () => {
  const result = runCli(["check", "--rpc", "http://127.0.0.1:9999"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /Fiber RPC unreachable/);
});

test("check command json mode returns machine-readable output", () => {
  const result = runCli(["check", "--rpc", "http://127.0.0.1:9999", "--json"]);

  assert.equal(result.status, 1);
  assert.doesNotMatch(result.output, /Fiber Doctor Check/);
  assert.match(result.output, /Fiber RPC unreachable/);
});

test("report command json mode still returns a clean failure path", () => {
  const result = runCli(["report", "--rpc", "http://127.0.0.1:9999", "--json"]);

  assert.equal(result.status, 1);
  assert.doesNotMatch(result.output, /Fiber Doctor Report/);
  assert.match(result.output, /Could not generate report because Fiber RPC is unreachable/);
});

test("explain command verbose mode includes raw parsed input", () => {
  const result = runCli(["explain", "./examples/no-peers.txt", "--verbose"]);

  assert.equal(result.status, 0);
  assert.match(result.output, /Raw parsed input:/);
  assert.match(result.output, /No connected peers detected/);
});
