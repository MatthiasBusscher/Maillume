import { NextResponse } from "next/server";

import {
  getExtensionCapabilities,
  getExtensionResponseHeaders,
} from "@/lib/extension-compatibility";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getExtensionCapabilities(), {
    headers: {
      "Cache-Control": "no-store",
      ...getExtensionResponseHeaders(),
    },
  });
}
