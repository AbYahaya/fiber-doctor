import { NextRequest } from "next/server";

import { getExplainResponse, renderErrorResponse } from "../../../lib/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      input?: string | Record<string, unknown>;
    };

    return Response.json(getExplainResponse(body.input ?? ""));
  } catch (error) {
    return renderErrorResponse(error);
  }
}
