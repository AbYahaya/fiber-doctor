import type { JsonRpcRequest, JsonRpcResponse } from "./types.js";

import {
  FiberNetworkError,
  FiberResponseParseError,
  FiberRpcError,
} from "../utils/errors.js";

export class FiberRpcClient {
  private nextId = 1;

  public constructor(private readonly rpcUrl: string) {}

  public get url(): string {
    return this.rpcUrl;
  }

  public async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const requestBody: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method,
      params,
    };

    let response: Response;
    try {
      response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      throw new FiberNetworkError(
        `Failed to reach Fiber RPC at ${this.rpcUrl}`,
        error,
      );
    }

    let payload: JsonRpcResponse<T>;
    try {
      payload = (await response.json()) as JsonRpcResponse<T>;
    } catch (error) {
      throw new FiberResponseParseError(
        `Fiber RPC at ${this.rpcUrl} returned invalid JSON`,
        error,
      );
    }

    if ("error" in payload) {
      throw new FiberRpcError(
        payload.error.message,
        payload.error.code,
        payload.error.data,
      );
    }

    return payload.result;
  }
}
