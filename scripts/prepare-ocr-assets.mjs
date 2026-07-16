import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const output = join(root, "public", "ocr");
const coreOutput = join(output, "core");
const languageOutput = join(output, "lang");

await Promise.all([
  mkdir(coreOutput, { recursive: true }),
  mkdir(languageOutput, { recursive: true }),
]);

await cp(
  join(root, "node_modules", "tesseract.js", "dist", "worker.min.js"),
  join(output, "worker.min.js"),
);

const coreSource = join(root, "node_modules", "tesseract.js-core");
for (const filename of await readdir(coreSource)) {
  if (filename.endsWith(".wasm.js")) {
    await cp(join(coreSource, filename), join(coreOutput, filename));
  }
}

for (const language of ["eng", "nld"]) {
  await cp(
    join(
      root,
      "node_modules",
      "@tesseract.js-data",
      language,
      "4.0.0_best_int",
      `${language}.traineddata.gz`,
    ),
    join(languageOutput, `${language}.traineddata.gz`),
  );
}
