import type { AnalyzeEmailResult } from "./analyze-email";
import {
  countSuccessfulAnalysis,
  createAnalysisFailure,
  createAnalysisSuccessResponse,
  executeAnalysisRequest,
  type AnalysisHttpFailure,
} from "./http";
import type { NormalizedScanInput } from "../types";

export type HostedQuotaRow = {
  api_key_id: string | null;
  monthly_quota: number | null;
  operation_status: string;
  owner_id: string | null;
  request_count: number | null;
  reservation_id: string | null;
};

export type HostedQuotaRpc = (
  operation:
    | "reserve_account_api_quota"
    | "finalize_account_api_quota"
    | "refund_account_api_quota",
  parameters: Record<string, string>,
) => Promise<{ data: unknown; error: unknown }>;

type HostedAnalysisSuccess = {
  ok: true;
  analysis: AnalyzeEmailResult;
  monthlyQuota: number;
  requestCount: number;
};

type HostedAnalysisFailure = {
  ok: false;
  failure: AnalysisHttpFailure;
};

type HostedAnalysisDependencies = {
  count?: typeof countSuccessfulAnalysis;
  execute?: typeof executeAnalysisRequest;
  now?: () => number;
};

export async function executeHostedAnalysis(
  request: Request,
  input: NormalizedScanInput,
  secretHash: string,
  rpc: HostedQuotaRpc,
  dependencies: HostedAnalysisDependencies = {},
): Promise<HostedAnalysisSuccess | HostedAnalysisFailure> {
  const execute = dependencies.execute ?? executeAnalysisRequest;
  const count = dependencies.count ?? countSuccessfulAnalysis;
  let reservationId: string | undefined;

  try {
    const reservation = await rpc("reserve_account_api_quota", {
      p_secret_hash: secretHash,
    });
    if (reservation.error) {
      return hostedFailure("API quota validation is temporarily unavailable.", 503);
    }

    const quota = (reservation.data as HostedQuotaRow[] | null)?.[0];
    if (!quota) {
      return hostedFailure("API key validation is temporarily unavailable.", 503);
    }
    if (quota.operation_status !== "reserved" || !quota.reservation_id) {
      return { ok: false, failure: apiKeyStatusFailure(quota.operation_status, dependencies.now) };
    }

    reservationId = quota.reservation_id;
    const executed = await execute(request, input);
    if (!executed.ok) {
      if (!await applyReservationOperation(rpc, "refund_account_api_quota", reservationId)) {
        return hostedFailure(
          "Analysis failed and API quota could not be restored automatically.",
          503,
        );
      }
      reservationId = undefined;
      return executed;
    }

    if (!await applyReservationOperation(
      rpc,
      "finalize_account_api_quota",
      reservationId,
    )) {
      if (!await applyReservationOperation(
        rpc,
        "refund_account_api_quota",
        reservationId,
      )) {
        return hostedFailure(
          "Analysis failed and API quota could not be restored automatically.",
          503,
        );
      }
      reservationId = undefined;
      return hostedFailure("Analysis could not be finalized. API quota was restored.", 503);
    }

    reservationId = undefined;
    count(input);
    return {
      ok: true,
      analysis: executed.value,
      monthlyQuota: quota.monthly_quota ?? 0,
      requestCount: quota.request_count ?? 0,
    };
  } catch {
    if (
      reservationId
      && !await applyReservationOperation(rpc, "refund_account_api_quota", reservationId)
    ) {
      return hostedFailure(
        "Analysis failed and API quota could not be restored automatically.",
        503,
      );
    }
    return hostedFailure("Analysis failed unexpectedly. API quota was restored.", 500);
  }
}

export function createHostedAnalysisSuccessResponse(
  input: NormalizedScanInput,
  hosted: HostedAnalysisSuccess,
  headers: HeadersInit = {},
) {
  return createAnalysisSuccessResponse(
    input,
    hosted.analysis,
    {
      ...Object.fromEntries(new Headers(headers)),
      "X-RateLimit-Limit": String(hosted.monthlyQuota),
      "X-RateLimit-Remaining": String(
        Math.max(0, hosted.monthlyQuota - hosted.requestCount),
      ),
    },
  );
}

async function applyReservationOperation(
  rpc: HostedQuotaRpc,
  operation: "finalize_account_api_quota" | "refund_account_api_quota",
  reservationId: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await rpc(operation, { p_reservation_id: reservationId });
      if (!error && data === true) return true;
    } catch {
      // Retry transient RPC exceptions just like returned database errors.
    }
  }
  return false;
}

function apiKeyStatusFailure(
  status: string,
  now: (() => number) | undefined,
): AnalysisHttpFailure {
  if (status === "exhausted") {
    return createAnalysisFailure("Monthly account API quota exhausted.", 429, {
      "Retry-After": secondsUntilNextMonth(now?.() ?? Date.now()),
    });
  }
  if (status === "expired") return createAnalysisFailure("API key has expired.", 401);
  if (status === "revoked") return createAnalysisFailure("API key has been revoked.", 401);
  return createAnalysisFailure("API key is invalid.", 401);
}

function hostedFailure(error: string, status: number): HostedAnalysisFailure {
  return { ok: false, failure: createAnalysisFailure(error, status) };
}

function secondsUntilNextMonth(now: number) {
  const current = new Date(now);
  const nextMonth = Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1);
  return String(Math.max(1, Math.ceil((nextMonth - now) / 1_000)));
}
