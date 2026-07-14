export const fixtureSamples = {
  check: JSON.stringify(
    {
      nodeInfo: {
        chain_hash:
          "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606",
        channel_count: "0x0",
        peers_count: "0x4",
        pubkey: "031021597829e4c7c3f20eee2d1a51c874a0e94b9479d1498f4d0984b56064d897",
        version: "0.9.0-rc7",
      },
      peers: [
        { pubkey: "peer-1" },
        { pubkey: "peer-2" },
        { pubkey: "peer-3" },
        { pubkey: "peer-4" },
      ],
    },
    null,
    2,
  ),
  channels: JSON.stringify(
    {
      allChannels: [
        {
          local_balance: "0x2bc",
          remote_balance: "0x12c",
          state: { state_name: "ChannelReady" },
        },
      ],
      pendingOrFailedChannels: [],
    },
    null,
    2,
  ),
  report: JSON.stringify(
    {
      allChannels: [],
      nodeInfo: {
        chain_hash:
          "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606",
        channel_count: "0x0",
        peers_count: "0x4",
        pubkey: "031021597829e4c7c3f20eee2d1a51c874a0e94b9479d1498f4d0984b56064d897",
        version: "0.9.0-rc7",
      },
      pendingOrFailedChannels: [
        {
          failure_detail: "Funding transaction aborted",
          pubkey: "0313dcf9cf18711b1b473a78ea56222dc44dcbfdf559d24dd937a0657d3bcb108f",
          state: { state_name: "Closed", state_flags: "FUNDING_ABORTED" },
        },
      ],
      peers: [
        { pubkey: "peer-1" },
        { pubkey: "peer-2" },
        { pubkey: "peer-3" },
        { pubkey: "peer-4" },
      ],
      payments: [
        {
          created_at: "0x19f58ca866d",
          failed_error:
            "Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000",
          last_updated_at: "0x19f58ca866e",
          payment_hash: "0x2222222222222222222222222222222222222222222222222222222222222222",
          status: "Failed",
        },
      ],
    },
    null,
    2,
  ),
  explain:
    'Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000',
} as const;

export const fixturePresets = {
  check: [
    {
      description: "Matches the saved healthy node summary.",
      key: "check-sample",
      label: "Healthy node snapshot",
      value: fixtureSamples.check,
    },
    {
      description: "A minimal node response with no peers or channels.",
      key: "minimal-node",
      label: "Minimal node snapshot",
      value: JSON.stringify(
        {
          nodeInfo: {},
          peers: [],
        },
        null,
        2,
      ),
    },
  ],
  channels: [
    {
      description: "Matches the saved active channel example.",
      key: "channels-active",
      label: "Active channel snapshot",
      value: JSON.stringify(
        {
          allChannels: [
            {
              local_balance: "0x2bc",
              remote_balance: "0x12c",
              state: { state_name: "ChannelReady" },
            },
          ],
          pendingOrFailedChannels: [],
        },
        null,
        2,
      ),
    },
    {
      description: "A blocked node with no channels at all.",
      key: "channels-empty",
      label: "Empty channel snapshot",
      value: JSON.stringify(
        {
          allChannels: [],
          pendingOrFailedChannels: [],
        },
        null,
        2,
      ),
    },
    {
      description: "A pending channel that failed funding.",
      key: "channels-failed",
      label: "Failed opening snapshot",
      value: JSON.stringify(
        {
          allChannels: [],
          pendingOrFailedChannels: [
            {
              failure_detail: "Funding transaction aborted",
              pubkey: "0313dcf9cf18711b1b473a78ea56222dc44dcbfdf559d24dd937a0657d3bcb108f",
              state: { state_name: "Closed", state_flags: "FUNDING_ABORTED" },
            },
          ],
        },
        null,
        2,
      ),
    },
  ],
  explain: [
    {
      description: "The most common outbound-liquidity payment failure.",
      key: "failed-payment",
      label: "Outbound liquidity failure",
      value:
        'Send payment error: Failed to build route, Insufficient balance: max outbound liquidity 0 is insufficient, required amount: 1000',
    },
    {
      description: "A funding transaction that never completed.",
      key: "failed-channel",
      label: "Channel funding failure",
      value: 'Funding transaction aborted',
    },
    {
      description: "A JSON-RPC error response from the node.",
      key: "method-not-found",
      label: "RPC method unavailable",
      value: JSON.stringify(
        {
          error: {
            code: -32601,
            message: "Method not found",
          },
          id: 1,
          jsonrpc: "2.0",
        },
        null,
        2,
      ),
    },
    {
      description: "A missing-invoice JSON error response.",
      key: "invoice-not-found",
      label: "Invoice not found",
      value: JSON.stringify(
        {
          error: {
            code: -32000,
            message: "invoice not found",
          },
        },
        null,
        2,
      ),
    },
    {
      description: "A node with no connected peers.",
      key: "no-peers",
      label: "No peers connected",
      value: "No connected peers detected",
    },
    {
      description: "A node with no active channels.",
      key: "no-active-channels",
      label: "No active channels",
      value: "No active channels found",
    },
    {
      description: "A node with no outbound liquidity.",
      key: "no-outbound-liquidity",
      label: "No outbound liquidity",
      value: "No outbound liquidity detected",
    },
    {
      description: "A node with no inbound liquidity.",
      key: "no-inbound-liquidity",
      label: "No inbound liquidity",
      value: "No inbound liquidity detected",
    },
    {
      description: "A successful payment record for comparison.",
      key: "payment-succeeded",
      label: "Payment succeeded",
      value: JSON.stringify(
        {
          payment_hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
          status: "Succeeded",
        },
        null,
        2,
      ),
    },
    {
      description: "A payment that is still in flight.",
      key: "payment-inflight",
      label: "Payment in flight",
      value: JSON.stringify(
        {
          payment_hash: "0x4444444444444444444444444444444444444444444444444444444444444444",
          status: "Inflight",
        },
        null,
        2,
      ),
    },
  ],
  report: [
    {
      description: "Matches the saved blocked report sample.",
      key: "report-sample",
      label: "Blocked report snapshot",
      value: fixtureSamples.report,
    },
    {
      description: "A healthy report with one active channel and a successful payment.",
      key: "healthy-report",
      label: "Healthy report snapshot",
      value: JSON.stringify(
        {
          allChannels: [
            {
              local_balance: "0x2bc",
              remote_balance: "0x12c",
              state: { state_name: "ChannelReady" },
            },
          ],
          nodeInfo: {
            chain_hash:
              "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606",
            channel_count: "0x1",
            peers_count: "0x4",
            pubkey: "031021597829e4c7c3f20eee2d1a51c874a0e94b9479d1498f4d0984b56064d897",
            version: "0.9.0-rc7",
          },
          pendingOrFailedChannels: [],
          peers: [
            { pubkey: "peer-1" },
            { pubkey: "peer-2" },
            { pubkey: "peer-3" },
            { pubkey: "peer-4" },
          ],
          payments: [
            {
              payment_hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
              status: "Succeeded",
            },
          ],
        },
        null,
        2,
      ),
    },
  ],
} as const;

export type FixtureTab = keyof typeof fixturePresets;

export type FixturePreset = (typeof fixturePresets)[FixtureTab][number];