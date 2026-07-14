export function formatMaybeHexCount(value?: string): string {
  if (!value) {
    return "unknown";
  }

  if (!value.startsWith("0x")) {
    return value;
  }

  try {
    return BigInt(value).toString(10);
  } catch {
    return value;
  }
}

export function formatBalance(value?: string): string {
  return formatMaybeHexCount(value);
}

export function sumHexBalances(values: Array<string | undefined>): string {
  let total = 0n;

  for (const value of values) {
    if (!value) {
      continue;
    }

    try {
      total += BigInt(value);
    } catch {
      // Ignore malformed balances in aggregate summaries.
    }
  }

  return total.toString(10);
}

export function inferNetworkLabel(chainHash?: string): string {
  if (!chainHash) {
    return "unknown";
  }

  if (
    chainHash === "0x10639e0895502b5688a6be8cf69460d76541bfa4821629d86d62ba0aae3f9606"
  ) {
    return "Fiber testnet";
  }

  return "unknown";
}
