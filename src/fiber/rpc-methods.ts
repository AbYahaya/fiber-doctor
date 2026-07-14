import { FiberRpcClient } from "./rpc-client.js";
import type {
  FiberChannelList,
  FiberGetInvoiceParams,
  FiberGetPaymentParams,
  FiberGraphChannelList,
  FiberGraphNodeList,
  FiberGraphQueryParams,
  FiberInvoice,
  FiberNodeInfo,
  FiberPaymentList,
  FiberParsedInvoice,
  FiberPeerList,
  FiberParseInvoiceParams,
  FiberSendPaymentParams,
  FiberSendPaymentResult,
} from "./types.js";

export async function getNodeInfo(
  client: FiberRpcClient,
): Promise<FiberNodeInfo> {
  return client.call<FiberNodeInfo>("node_info");
}

export async function listPeers(
  client: FiberRpcClient,
): Promise<FiberPeerList> {
  return client.call<FiberPeerList>("list_peers");
}

export async function listChannels(
  client: FiberRpcClient,
  params: {
    includeClosed?: boolean;
    onlyPending?: boolean;
  } = {},
): Promise<FiberChannelList> {
  return client.call<FiberChannelList>("list_channels", [
    {
      include_closed: params.includeClosed,
      only_pending: params.onlyPending,
    },
  ]);
}

export async function listPayments(
  client: FiberRpcClient,
  params: {
    limit?: string;
    status?: string;
  } = {},
): Promise<FiberPaymentList> {
  return client.call<FiberPaymentList>("list_payments", [
    {
      limit: params.limit,
      status: params.status,
    },
  ]);
}

export async function sendPayment(
  client: FiberRpcClient,
  params: FiberSendPaymentParams,
): Promise<FiberSendPaymentResult> {
  return client.call<FiberSendPaymentResult>("send_payment", [params]);
}

export async function getPayment(
  client: FiberRpcClient,
  params: FiberGetPaymentParams,
): Promise<FiberSendPaymentResult> {
  return client.call<FiberSendPaymentResult>("get_payment", [params]);
}

export async function parseInvoice(
  client: FiberRpcClient,
  params: FiberParseInvoiceParams,
): Promise<FiberParsedInvoice> {
  return client.call<FiberParsedInvoice>("parse_invoice", [params]);
}

export async function getInvoice(
  client: FiberRpcClient,
  params: FiberGetInvoiceParams,
): Promise<FiberInvoice> {
  return client.call<FiberInvoice>("get_invoice", [params]);
}

export async function graphNodes(
  client: FiberRpcClient,
  params: FiberGraphQueryParams = {},
): Promise<FiberGraphNodeList> {
  return client.call<FiberGraphNodeList>("graph_nodes", [params]);
}

export async function graphChannels(
  client: FiberRpcClient,
  params: FiberGraphQueryParams = {},
): Promise<FiberGraphChannelList> {
  return client.call<FiberGraphChannelList>("graph_channels", [params]);
}
