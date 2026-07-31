import { NextResponse } from "next/server";

import {
  ANALYSIS_NO_STORE_HEADERS,
  createAnalysisErrorResponse,
  createAnalysisFailure,
  enforceAnalysisRequestLimit,
  parseAnalysisRequest,
} from "@/lib/analysis/http";
import {
  createHostedAnalysisSuccessResponse,
  executeHostedAnalysis,
  type HostedQuotaRpc,
} from "@/lib/analysis/hosted";
import { hashApiKey, isApiKeyFormat } from "@/lib/api-keys";
import { areAccountsEnabled } from "@/lib/accounts/config";
import {
  evaluateExtensionCompatibility,
  getExtensionResponseHeaders,
  hasExtensionClientHeaders,
  LATEST_BROWSER_EXTENSION_VERSION,
  MINIMUM_ANALYSIS_EXTENSION_VERSION,
} from "@/lib/extension-compatibility";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ANALYSIS_PIPELINE_VERSION } from "@/lib/types";

const NO_STORE_HEADERS = {
  ...ANALYSIS_NO_STORE_HEADERS,
  ...getExtensionResponseHeaders(),
};

export async function POST(request: Request) {
  if (!areAccountsEnabled()) {
    return createAnalysisErrorResponse(createAnalysisFailure("Not found.", 404), NO_STORE_HEADERS);
  }
  const token = getBearerToken(request);
  if (!token || !isApiKeyFormat(token)) {
    return createAnalysisErrorResponse(
      createAnalysisFailure("A valid Maillume API key is required.", 401),
      NO_STORE_HEADERS,
    );
  }

  const rateLimitFailure = enforceAnalysisRequestLimit(request);
  if (rateLimitFailure) return createAnalysisErrorResponse(rateLimitFailure, NO_STORE_HEADERS);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return createAnalysisErrorResponse(
      createAnalysisFailure("Hosted API access is not configured.", 503),
      NO_STORE_HEADERS,
    );
  }

  const parsed = await parseAnalysisRequest(request);
  if (!parsed.ok) return createAnalysisErrorResponse(parsed.failure, NO_STORE_HEADERS);
  if (parsed.value.source === "chrome" && hasExtensionClientHeaders(request.headers)) {
    // The API key authenticates analysis requests. Keep unpacked/self-hosted
    // development clients usable while reserving the official ID requirement
    // for automatic account pairing.
    const compatibility = evaluateExtensionCompatibility(request.headers, {
      requireOfficialId: false,
    });
    if (!compatibility.compatible) {
      return NextResponse.json({
        error: "This Maillume extension must be updated before it can use the deployment.",
        code: "extension_upgrade_required",
        ...getExtensionCapabilitiesForError(),
      }, {
        status: 426,
        headers: NO_STORE_HEADERS,
      });
    }
  }

  const secretHash = hashApiKey(token);
  const rpc: HostedQuotaRpc = async (operation, parameters) => {
    const { data, error } = await admin.rpc(operation, parameters);
    return { data, error };
  };
  const hosted = await executeHostedAnalysis(
    request,
    parsed.value,
    secretHash,
    rpc,
  );
  if (!hosted.ok) {
    return createAnalysisErrorResponse(hosted.failure, NO_STORE_HEADERS);
  }

  return createHostedAnalysisSuccessResponse(
    parsed.value,
    hosted,
    NO_STORE_HEADERS,
  );
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim();
}

function getExtensionCapabilitiesForError() {
  return {
    analysis_version: ANALYSIS_PIPELINE_VERSION,
    latest_extension_version: LATEST_BROWSER_EXTENSION_VERSION,
    minimum_extension_version: MINIMUM_ANALYSIS_EXTENSION_VERSION,
  };
}
