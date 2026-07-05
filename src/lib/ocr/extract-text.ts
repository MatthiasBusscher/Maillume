export async function extractTextFromImage(file: File): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "eng+nld");

  return result.data.text.trim();
}

