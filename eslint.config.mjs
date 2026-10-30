import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".analysis-tests/**",
    ".heuristic-tests/**",
    ".training-data/**",
    ".next/**",
    "next-env.d.ts",
    "node_modules/**",
    "public/ocr/**",
  ]),
]);

export default eslintConfig;
