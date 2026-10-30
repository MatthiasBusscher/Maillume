import { NextResponse } from "next/server";

import {
  countSuccessfulAnalysis,
  createAnalysisErrorResponse,
  createAnalysisSuccessResponse,
  enforceAnalysisRequestLimit,
  executeAnalysisRequest,
  parseAnalysisRequest,
} from "@/lib/analysis/http";
import {
  evaluateExtensionCompatibility,
  getExtensionResponseHeaders,
  hasExtensionClientHeaders,
  LATEST_BROWSER_EXTENSION_VERSION,
  MINIMUM_ANALYSIS_EXTENSION_VERSION,
} from "@/lib/extension-compatibility";
import { ANALYSIS_PIPELINE_VERSION } from "@/lib/types";

const EXTENSION_HEADERS = getExtensionResponseHeaders();

// Anonymous, versioned analysis for the browser extension and other integrations.
// It shares the per-client limits of the website scanner and stores no content.
export async function POST(request: Request) {
  const rateLimitFailure = enforceAnalysisRequestLimit(request);
  if (rateLimitFailure) return createAnalysisErrorResponse(rateLimitFailure, EXTENSION_HEADERS);

  const parsed = await parseAnalysisRequest(request);
  if (!parsed.ok) return createAnalysisErrorResponse(parsed.failure, EXTENSION_HEADERS);
  if (parsed.value.source === "chrome" && hasExtensionClientHeaders(request.headers)) {
    const compatibility = evaluateExtensionCompatibility(request.headers, {
      requireOfficialId: false,
    });
    if (!compatibility.compatible) {
      return NextResponse.json({
        error: "This Maillume extension must be updated before it can use the deployment.",
        code: "extension_upgrade_required",
        analysis_version: ANALYSIS_PIPELINE_VERSION,
        latest_extension_version: LATEST_BROWSER_EXTENSION_VERSION,
        minimum_extension_version: MINIMUM_ANALYSIS_EXTENSION_VERSION,
      }, {
        status: 426,
        headers: { "Cache-Control": "no-store", ...EXTENSION_HEADERS },
      });
    }
  }

  const executed = await executeAnalysisRequest(request, parsed.value);
  if (!executed.ok) return createAnalysisErrorResponse(executed.failure, EXTENSION_HEADERS);

  countSuccessfulAnalysis(parsed.value);
  return createAnalysisSuccessResponse(parsed.value, executed.value, EXTENSION_HEADERS);
}
