import { NextRequest } from "next/server";

import { getCheckResponse, renderErrorResponse } from "../../../lib/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      configPath?: string;
      fixture?: Record<string, unknown>;
      rpcUrl?: string;
    };

    return Response.json(await getCheckResponse(body));
  } catch (error) {
    return renderErrorResponse(error);
  }
}
