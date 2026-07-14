export type JsonRpcId = number | string;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params: unknown[];
};

export type JsonRpcSuccess<T> = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: T;
};

export type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure;

export type FiberNodeInfo = {
  addresses?: string[];
  auto_accept_channel_ckb_funding_amount?: string;
  chain_hash?: string;
  channel_count?: string;
  commit_hash?: string;
  default_funding_lock_script?: {
    args?: string;
    code_hash?: string;
    hash_type?: string;
  };
  features?: string[];
  node_name?: string | null;
  open_channel_auto_accept_min_ckb_funding_amount?: string;
  peers_count?: string;
  pending_channel_count?: string;
  pubkey?: string;
  tlc_expiry_delta?: string;
  tlc_fee_proportional_millionths?: string;
  tlc_min_value?: string;
  udt_cfg_infos?: Array<{
    auto_accept_amount?: string;
    name?: string;
  }>;
  version?: string;
};

export type FiberPeer = {
  address?: string;
  pubkey?: string;
};

export type FiberPeerList = {
  peers?: FiberPeer[];
};

export type FiberChannelState = {
  state_flags?: string;
  state_name?: string;
};

export type FiberChannel = {
  capacity?: string;
  channel_id?: string;
  channel_outpoint?: string | null;
  created_at?: string;
  enabled?: boolean;
  failure_detail?: string | null;
  funding_udt_type_script?: unknown | null;
  is_acceptor?: boolean;
  is_one_way?: boolean;
  is_public?: boolean;
  local_balance?: string;
  offered_tlc_balance?: string;
  pending_tlcs?: unknown[];
  pubkey?: string;
  received_tlc_balance?: string;
  remote_balance?: string;
  shutdown_transaction_hash?: string | null;
  state?: FiberChannelState;
  tlc_expiry_delta?: string;
  tlc_fee_proportional_millionths?: string;
};

export type FiberChannelList = {
  channels?: FiberChannel[];
};

export type FiberPayment = {
  created_at?: string;
  custom_records?: unknown;
  failed_error?: string | null;
  fee?: string;
  last_updated_at?: string;
  payment_hash?: string;
  status?: string;
};

export type FiberPaymentList = {
  last_cursor?: string;
  payments?: FiberPayment[];
};

export type FiberSendPaymentParams = {
  allow_self_payment?: boolean;
  amount?: string;
  custom_records?: Record<string, string>;
  dry_run?: boolean;
  final_tlc_expiry_delta?: string;
  hop_hints?: unknown[];
  invoice?: string;
  keysend?: boolean;
  max_fee_amount?: string;
  max_fee_rate?: string;
  max_parts?: string;
  payment_hash?: string;
  target_pubkey?: string;
  timeout?: string;
  tlc_expiry_limit?: string;
  trampoline_hops?: string[];
  udt_type_script?: unknown;
};

export type FiberSendPaymentResult = {
  created_at?: string;
  custom_records?: unknown;
  fee?: string;
  payment_hash?: string;
  status?: string;
};

export type FiberGetPaymentParams = {
  payment_hash: string;
};

export type FiberParseInvoiceParams = {
  invoice: string;
};

export type FiberParsedInvoice = {
  amount?: string | null;
  currency?: string;
  description?: string | null;
  expiry?: string;
  hash_algorithm?: string;
  payment_hash?: string;
  payee_pub_key?: string | null;
  timestamp?: string;
  udt_type_script?: unknown | null;
};

export type FiberGetInvoiceParams = {
  payment_hash: string;
};

export type FiberInvoice = {
  amount?: string | null;
  created_at?: string;
  description?: string | null;
  invoice_address?: string;
  payment_hash?: string;
  preimage?: string | null;
  status?: string;
  expiry?: string;
  paid_at?: string | null;
};

export type FiberGraphQueryParams = {
  after?: string;
  limit?: string;
};

export type FiberGraphNode = {
  addresses?: string[];
  alias?: string | null;
  features?: string[];
  node_name?: string | null;
  pubkey?: string;
  udt_cfg_infos?: Array<{
    auto_accept_amount?: string;
    name?: string;
  }>;
};

export type FiberGraphNodeList = {
  last_cursor?: string;
  nodes?: FiberGraphNode[];
};

export type FiberGraphChannel = {
  capacity?: string;
  chain_hash?: string;
  channel_outpoint?: string;
  is_public?: boolean;
  node1?: string;
  node2?: string;
  tlc_expiry_delta?: string;
  tlc_fee_proportional_millionths?: string;
  tlc_min_value?: string;
  udt_type_script?: unknown | null;
  update_timestamp?: string;
};

export type FiberGraphChannelList = {
  channels?: FiberGraphChannel[];
  last_cursor?: string;
};
