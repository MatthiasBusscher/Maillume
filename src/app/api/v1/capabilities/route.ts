import { NextResponse } from "next/server";

import {
  getExtensionCapabilities,
  getExtensionResponseHeaders,
} from "@/lib/extension-compatibility";
import { areAccountsEnabled } from "@/lib/accounts/config";

export const dynamic = "force-dynamic";

export function GET() {
  const capabilities = getExtensionCapabilities();
  return NextResponse.json({
    ...capabilities,
    extension: {
      ...capabilities.extension,
      pairing_available: areAccountsEnabled(),
    },
  }, {
    headers: {
      "Cache-Control": "no-store",
      ...getExtensionResponseHeaders(),
    },
  });
}
