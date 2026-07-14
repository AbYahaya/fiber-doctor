import test from "node:test";
import assert from "node:assert/strict";

import { FiberRpcClient } from "../src/fiber/rpc-client.js";
import {
  FiberNetworkError,
  FiberResponseParseError,
  FiberRpcError,
} from "../src/utils/errors.js";

test("rpc client sends json-rpc requests and returns the result", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return {
      json: async () => ({
        id: 1,
        jsonrpc: "2.0",
        result: { ok: true },
      }),
    } as Response;
  }) as typeof fetch;

  try {
    const client = new FiberRpcClient("http://127.0.0.1:8227");
    const result = await client.call<{ ok: boolean }>("node_info", []);

    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "http://127.0.0.1:8227");
    assert.equal(calls[0]?.init?.method, "POST");
    assert.match(String(calls[0]?.init?.body), /"method":"node_info"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rpc client normalizes network failures", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new Error("connect ECONNREFUSED");
  }) as typeof fetch;

  try {
    const client = new FiberRpcClient("http://127.0.0.1:8227");

    await assert.rejects(
      () => client.call("node_info", []),
      (error: unknown) =>
        error instanceof FiberNetworkError &&
        /Failed to reach Fiber RPC/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rpc client normalizes invalid json responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    ({
      json: async () => {
        throw new Error("invalid json");
      },
    }) as Response) as typeof fetch;

  try {
    const client = new FiberRpcClient("http://127.0.0.1:8227");

    await assert.rejects(
      () => client.call("node_info", []),
      (error: unknown) =>
        error instanceof FiberResponseParseError &&
        /returned invalid JSON/.test(error.message),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rpc client normalizes json-rpc errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    ({
      json: async () => ({
        error: {
          code: -32601,
          message: "Method not found",
        },
        id: 1,
        jsonrpc: "2.0",
      }),
    }) as Response) as typeof fetch;

  try {
    const client = new FiberRpcClient("http://127.0.0.1:8227");

    await assert.rejects(
      () => client.call("nope", []),
      (error: unknown) =>
        error instanceof FiberRpcError &&
        error.code === -32601 &&
        error.message === "Method not found",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
