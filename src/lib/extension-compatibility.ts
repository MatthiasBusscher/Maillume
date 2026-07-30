import { PUBLIC_CONTRACT } from "./contracts/public-contract";
import { ANALYSIS_PIPELINE_VERSION } from "./types";

export const OFFICIAL_BROWSER_EXTENSION_ID: string = PUBLIC_CONTRACT.extension.officialId;
export const LATEST_BROWSER_EXTENSION_VERSION: string = PUBLIC_CONTRACT.extension.currentVersion;
export const MINIMUM_ANALYSIS_EXTENSION_VERSION: string = PUBLIC_CONTRACT.extension.minimumAnalysisVersion;
export const MINIMUM_PAIRING_EXTENSION_VERSION: string = PUBLIC_CONTRACT.extension.minimumPairingVersion;
export const SUPPORTED_EXTENSION_ANALYSIS_VERSIONS = PUBLIC_CONTRACT.extension.supportedAnalysisVersions;

export const EXTENSION_CLIENT_HEADERS = PUBLIC_CONTRACT.extension.clientHeaders;

export type ExtensionClient = {
  analysisVersions: string[];
  extensionId: string;
  extensionVersion: string;
};

export type ExtensionCompatibility =
  | { compatible: true; client: ExtensionClient }
  | {
      compatible: false;
      client: ExtensionClient | null;
      reason: "invalid_client" | "unsupported_analysis" | "upgrade_required";
    };

export function getExtensionCapabilities() {
  return {
    analysis_version: ANALYSIS_PIPELINE_VERSION,
    api_version: "v1",
    extension: {
      id: OFFICIAL_BROWSER_EXTENSION_ID,
      latest_version: LATEST_BROWSER_EXTENSION_VERSION,
      minimum_analysis_version: MINIMUM_ANALYSIS_EXTENSION_VERSION,
      minimum_pairing_version: MINIMUM_PAIRING_EXTENSION_VERSION,
      pairing_available: true,
      supported_analysis_versions: [...SUPPORTED_EXTENSION_ANALYSIS_VERSIONS],
    },
  } as const;
}

export function getExtensionClient(headers: Headers): ExtensionClient | null {
  const extensionId = headers.get(EXTENSION_CLIENT_HEADERS.extensionId)?.trim() ?? "";
  const extensionVersion = headers.get(EXTENSION_CLIENT_HEADERS.extensionVersion)?.trim() ?? "";
  const analysisVersions = headers
    .get(EXTENSION_CLIENT_HEADERS.analysisVersions)
    ?.split(",")
    .map((version) => version.trim())
    .filter(Boolean) ?? [];

  if (!extensionId && !extensionVersion && analysisVersions.length === 0) return null;
  if (
    !/^[a-p]{32}$/.test(extensionId)
    || !isBrowserExtensionVersion(extensionVersion)
    || analysisVersions.length < 1
    || analysisVersions.length > 20
    || analysisVersions.some((version) => !/^analysis-v[1-9][0-9]{0,2}$/.test(version))
  ) {
    return null;
  }

  return {
    analysisVersions: [...new Set(analysisVersions)],
    extensionId,
    extensionVersion,
  };
}

export function evaluateExtensionCompatibility(
  headers: Headers,
  {
    minimumVersion = MINIMUM_ANALYSIS_EXTENSION_VERSION,
    requireOfficialId = true,
  }: {
    minimumVersion?: string;
    requireOfficialId?: boolean;
  } = {},
): ExtensionCompatibility {
  const hasClientHeaders = Object.values(EXTENSION_CLIENT_HEADERS)
    .some((header) => headers.has(header));
  const client = getExtensionClient(headers);

  if (!client) {
    return {
      compatible: false,
      client: null,
      reason: hasClientHeaders ? "invalid_client" : "invalid_client",
    };
  }
  if (requireOfficialId && client.extensionId !== OFFICIAL_BROWSER_EXTENSION_ID) {
    return { compatible: false, client, reason: "invalid_client" };
  }
  if (compareBrowserExtensionVersions(client.extensionVersion, minimumVersion) < 0) {
    return { compatible: false, client, reason: "upgrade_required" };
  }
  if (!client.analysisVersions.includes(ANALYSIS_PIPELINE_VERSION)) {
    return { compatible: false, client, reason: "unsupported_analysis" };
  }
  return { compatible: true, client };
}

export function hasExtensionClientHeaders(headers: Headers): boolean {
  return Object.values(EXTENSION_CLIENT_HEADERS).some((header) => headers.has(header));
}

export function getExtensionResponseHeaders(): Record<string, string> {
  return {
    "X-Maillume-Analysis-Version": ANALYSIS_PIPELINE_VERSION,
    "X-Maillume-Latest-Extension-Version": LATEST_BROWSER_EXTENSION_VERSION,
    "X-Maillume-Minimum-Extension-Version": MINIMUM_ANALYSIS_EXTENSION_VERSION,
  };
}

export function compareBrowserExtensionVersions(left: string, right: string): number {
  const leftParts = parseBrowserExtensionVersion(left);
  const rightParts = parseBrowserExtensionVersion(right);
  if (!leftParts || !rightParts) return Number.NaN;

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

export function isBrowserExtensionVersion(value: string): boolean {
  return parseBrowserExtensionVersion(value) !== null;
}

function parseBrowserExtensionVersion(value: string): [number, number, number] | null {
  if (!/^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/.test(value)) {
    return null;
  }
  const parts = value.split(".").map(Number);
  return parts.every((part) => Number.isSafeInteger(part) && part <= 65_535)
    ? parts as [number, number, number]
    : null;
}
