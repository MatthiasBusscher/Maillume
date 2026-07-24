import type { ScanSource } from "../types";
import { getScanCounterConfig, type ScanCounterConfig } from "./config";

export type MemoryScanCounter = {
  period_start: string;
  input_mode: ScanSource;
  scan_count: number;
};

type RecordScanOptions = {
  config?: ScanCounterConfig;
  fetchImpl?: typeof fetch;
  memoryCounters?: MemoryScanCounter[];
  now?: () => number;
};

declare global {
  var __maillumeMemoryScanCounters: MemoryScanCounter[] | undefined;
}

/**
 * Records one completed scan as an aggregate count.
 *
 * The only value sent is the input mode. Nothing about the message, the result, or the
 * person is included, and the server-side day is chosen by the database rather than the
 * caller. Failures are swallowed: a scan must never fail, slow down, or change its
 * result because counting did not work.
 */
export async function recordScan(
  inputMode: ScanSource,
  options: RecordScanOptions = {},
): Promise<void> {
  const config = options.config ?? getScanCounterConfig();

  if (config.mode === "disabled") return;

  if (config.mode === "memory") {
    recordScanInMemory(inputMode, options);
    return;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    apikey: config.apiKey,
    "Content-Type": "application/json",
  };

  if (config.useLegacyAuthorization) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  try {
    await fetchImpl(`${config.supabaseUrl}/rest/v1/rpc/record_scan`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_input_mode: inputMode }),
      cache: "no-store",
    });
  } catch {
    // Intentionally ignored. See the note above.
  }
}

/** Fire-and-forget wrapper for request handlers, which must not await the counter. */
export function countScan(inputMode: ScanSource, options: RecordScanOptions = {}): void {
  void recordScan(inputMode, options);
}

function recordScanInMemory(inputMode: ScanSource, options: RecordScanOptions): void {
  const counters = options.memoryCounters ?? getGlobalMemoryCounters();
  const periodStart = new Date(options.now?.() ?? Date.now()).toISOString().slice(0, 10);
  const existing = counters.find(
    (counter) => counter.period_start === periodStart && counter.input_mode === inputMode,
  );

  if (existing) {
    existing.scan_count += 1;
    return;
  }

  counters.push({ period_start: periodStart, input_mode: inputMode, scan_count: 1 });
}

function getGlobalMemoryCounters(): MemoryScanCounter[] {
  globalThis.__maillumeMemoryScanCounters ??= [];
  return globalThis.__maillumeMemoryScanCounters;
}
