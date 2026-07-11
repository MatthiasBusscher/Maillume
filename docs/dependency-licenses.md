# Direct Dependency License Review

Review date: 2026-07-10

This is a lightweight engineering review of direct npm dependency metadata before adopting AGPL-3.0. It is not a legal opinion and does not replace a complete software-composition analysis before public release.

## Runtime Dependencies

| Package | Declared license |
| --- | --- |
| `@supabase/ssr` | MIT |
| `@supabase/supabase-js` | MIT |
| `lucide-react` | ISC |
| `next` | MIT |
| `react` | MIT |
| `react-dom` | MIT |
| `tesseract.js` | Apache-2.0 |

## Development Dependencies

| Package | Declared license |
| --- | --- |
| `@eslint/eslintrc` | MIT |
| `@playwright/test` | Apache-2.0 |
| `@types/node` | MIT |
| `@types/react` | MIT |
| `@types/react-dom` | MIT |
| `autoprefixer` | MIT |
| `eslint` | MIT |
| `eslint-config-next` | MIT |
| `postcss` | MIT |
| `tailwindcss` | MIT |
| `typescript` | Apache-2.0 |

No obvious incompatibility was found in the direct dependency declarations. Preserve upstream copyright and license notices when distributing the application.

The public-beta deployment issue must still review the complete production dependency tree and generated distribution artifacts with an automated license or SBOM tool.
