import test from "node:test";
import assert from "node:assert/strict";

import {
  getNodeInfo,
  listPeers,
  listChannels,
  listPayments,
  sendPayment,
  getPayment,
  parseInvoice,
  getInvoice,
  graphNodes,
  graphChannels,
} from "../src/fiber/rpc-methods.js";

type CallRecord = {
  method: string;
  params: unknown[];
};

function createStubClient(): {
  client: {
    call<T>(method: string, params?: unknown[]): Promise<T>;
  };
  calls: CallRecord[];
} {
  const calls: CallRecord[] = [];

  return {
    client: {
      async call<T>(method: string, params: unknown[] = []): Promise<T> {
        calls.push({ method, params });
        return {} as T;
      },
    },
    calls,
  };
}

test("rpc method wrappers call the expected Fiber RPC methods", async () => {
  const { client, calls } = createStubClient();

  await getNodeInfo(client as never);
  await listPeers(client as never);
  await listChannels(client as never, { includeClosed: true, onlyPending: true });
  await listPayments(client as never, { limit: "10", status: "Failed" });
  await sendPayment(client as never, { invoice: "lnfib..." });
  await getPayment(client as never, { payment_hash: "0xabc" });
  await parseInvoice(client as never, { invoice: "lnfib..." });
  await getInvoice(client as never, { payment_hash: "0xdef" });
  await graphNodes(client as never, { after: "cursor-1", limit: "5" });
  await graphChannels(client as never, { after: "cursor-2", limit: "6" });

  assert.deepEqual(calls, [
    { method: "node_info", params: [] },
    { method: "list_peers", params: [] },
    {
      method: "list_channels",
      params: [{ include_closed: true, only_pending: true }],
    },
    {
      method: "list_payments",
      params: [{ limit: "10", status: "Failed" }],
    },
    {
      method: "send_payment",
      params: [{ invoice: "lnfib..." }],
    },
    {
      method: "get_payment",
      params: [{ payment_hash: "0xabc" }],
    },
    {
      method: "parse_invoice",
      params: [{ invoice: "lnfib..." }],
    },
    {
      method: "get_invoice",
      params: [{ payment_hash: "0xdef" }],
    },
    {
      method: "graph_nodes",
      params: [{ after: "cursor-1", limit: "5" }],
    },
    {
      method: "graph_channels",
      params: [{ after: "cursor-2", limit: "6" }],
    },
  ]);
});
