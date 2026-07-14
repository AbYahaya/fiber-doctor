import type {
  CheckResult,
  ChannelsResult,
  ExplainResult,
  ReportResult,
} from "./types";

async function requestJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json()) as T & {
    error?: { message?: string };
  };

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error.message ?? "Request failed"
        : "Request failed";
    throw new Error(message);
  }

  return payload;
}

export function runCheck(body: unknown): Promise<CheckResult> {
  return requestJson<CheckResult>("/api/check", body);
}

export function runChannels(body: unknown): Promise<ChannelsResult> {
  return requestJson<ChannelsResult>("/api/channels", body);
}

export function runReport(body: unknown): Promise<ReportResult> {
  return requestJson<ReportResult>("/api/report", body);
}

export function runExplain(body: unknown): Promise<ExplainResult> {
  return requestJson<ExplainResult>("/api/explain", body);
}