import { NextResponse } from "next/server";
import { ANALYSIS_PIPELINE_VERSION } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  const revision = process.env.BUILD_REVISION ?? "development";

  return NextResponse.json(
    {
      status: "ok",
      revision,
      analysis_version: ANALYSIS_PIPELINE_VERSION,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
