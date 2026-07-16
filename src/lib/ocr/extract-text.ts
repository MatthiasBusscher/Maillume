const OCR_TIMEOUT_MS = 45_000;

export async function extractTextFromImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const workerPromise = createWorker("eng+nld", undefined, { logger: () => undefined });
  let worker: Awaited<typeof workerPromise> | undefined;

  try {
    worker = await withTimeout(workerPromise, OCR_TIMEOUT_MS);
    const result = await withTimeout(worker.recognize(file), OCR_TIMEOUT_MS);

    return result.data.text.trim();
  } finally {
    if (worker) {
      await worker.terminate().catch(() => undefined);
    } else {
      void workerPromise.then((lateWorker) => lateWorker.terminate()).catch(() => undefined);
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("OCR timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
