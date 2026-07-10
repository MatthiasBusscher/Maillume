import { NextResponse } from "next/server";

import { FeedbackConfigError, getFeedbackConfig } from "@/lib/feedback/config";
import {
  enforceFeedbackRateLimit,
  FeedbackRateLimitError,
} from "@/lib/feedback/rate-limit";
import { FeedbackStorageError, storeFeedback } from "@/lib/feedback/storage";
import type {
  DetectionFeedbackErrorResponse,
  DetectionFeedbackResponse,
} from "@/lib/feedback/types";
import {
  MAX_FEEDBACK_PAYLOAD_BYTES,
  validateFeedbackSubmission,
} from "@/lib/feedback/validation";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  let config;

  try {
    config = getFeedbackConfig();
  } catch (error) {
    if (error instanceof FeedbackConfigError) {
      return jsonError("Feedback is not configured.", 503);
    }

    throw error;
  }

  if (config.mode === "disabled") {
    return jsonError("Feedback is not enabled.", 503);
  }

  try {
    enforceFeedbackRateLimit(request);
  } catch (error) {
    if (error instanceof FeedbackRateLimitError) {
      return jsonError(error.message, 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    }

    throw error;
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_FEEDBACK_PAYLOAD_BYTES) {
    return jsonError("Feedback payload is too large.", 413);
  }

  const rawPayload = await request.text();

  if (new TextEncoder().encode(rawPayload).byteLength > MAX_FEEDBACK_PAYLOAD_BYTES) {
    return jsonError("Feedback payload is too large.", 413);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return jsonError("Invalid JSON request body.", 400);
  }

  const validation = validateFeedbackSubmission(payload);

  if (!validation.ok) {
    return jsonError(validation.error, 400);
  }

  try {
    await storeFeedback(validation.input, config);
  } catch (error) {
    if (error instanceof FeedbackStorageError) {
      return jsonError(error.message, 503);
    }

    throw error;
  }

  return NextResponse.json<DetectionFeedbackResponse>(
    {
      accepted: true,
      storedContent: false,
      retention: "up_to_90_days",
    },
    {
      status: 201,
      headers: NO_STORE_HEADERS,
    },
  );
}

function jsonError(error: string, status: number, headers: HeadersInit = {}) {
  return NextResponse.json<DetectionFeedbackErrorResponse>(
    { error },
    {
      status,
      headers: {
        ...NO_STORE_HEADERS,
        ...headers,
      },
    },
  );
}
