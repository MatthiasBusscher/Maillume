const MAX_CONTEXT_SEGMENTS = 256;
const SEGMENT_BOUNDARY = /(?:[.!?]+(?=\s+|$)|[;\n]+)/g;

export type ContextSegment = {
  text: string;
  start: number;
  end: number;
};

export type EvidenceCandidate = {
  segment: ContextSegment;
  matchedText: string;
  matchStart: number;
  matchEnd: number;
};

export type ContextMatchOptions = {
  suppressions?: RegExp[];
};

export function segmentMessage(content: string): ContextSegment[] {
  const segments: ContextSegment[] = [];
  let start = 0;

  for (const boundary of content.matchAll(SEGMENT_BOUNDARY)) {
    if (segments.length >= MAX_CONTEXT_SEGMENTS - 1) break;
    const boundaryIndex = boundary.index ?? start;
    const end = boundaryIndex + boundary[0].length;
    pushSegment(content, start, end, segments);
    start = end;
  }
  pushSegment(content, start, content.length, segments);

  return segments;
}

export function findEvidenceCandidates(
  content: string,
  positives: RegExp[],
  options: ContextMatchOptions = {},
): EvidenceCandidate[] {
  if (!matchesAny(content, positives)) return [];

  const candidates: EvidenceCandidate[] = [];

  for (const segment of segmentMessage(content)) {
    if (matchesAny(segment.text, options.suppressions ?? [])) continue;
    const match = firstMatch(segment.text, positives);
    if (!match) continue;
    candidates.push({
      segment,
      matchedText: match[0],
      matchStart: segment.start + (match.index ?? 0),
      matchEnd: segment.start + (match.index ?? 0) + match[0].length,
    });
  }

  return candidates;
}

export function hasActionableMatch(
  content: string,
  positives: RegExp[],
  suppressions: RegExp[] = [],
): boolean {
  return findEvidenceCandidates(content, positives, { suppressions }).length > 0;
}

export function hasCooccurringContext(
  content: string,
  requiredGroups: RegExp[][],
  options: {
    suppressions?: RegExp[];
    windowSize?: number;
  } = {},
): boolean {
  if (requiredGroups.some((patterns) => !matchesAny(content, patterns))) {
    return false;
  }

  const segments = segmentMessage(content);
  const windowSize = Math.max(1, Math.min(options.windowSize ?? 2, 3));

  for (let index = 0; index < segments.length; index += 1) {
    const window = segments
      .slice(index, index + windowSize)
      .map((segment) => segment.text)
      .join(" ");
    if (matchesAny(window, options.suppressions ?? [])) continue;
    if (requiredGroups.every((patterns) => matchesAny(window, patterns))) {
      return true;
    }
  }

  return false;
}

function pushSegment(
  content: string,
  start: number,
  end: number,
  segments: ContextSegment[],
) {
  const raw = content.slice(start, end);
  const leadingWhitespace = raw.match(/^\s*/)?.[0].length ?? 0;
  const trailingWhitespace = raw.match(/\s*$/)?.[0].length ?? 0;
  const normalizedStart = start + leadingWhitespace;
  const normalizedEnd = Math.max(normalizedStart, end - trailingWhitespace);
  if (normalizedEnd <= normalizedStart) return;
  segments.push({
    text: content.slice(normalizedStart, normalizedEnd),
    start: normalizedStart,
    end: normalizedEnd,
  });
}

function matchesAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => Boolean(execPattern(pattern, content)));
}

function firstMatch(content: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const pattern of patterns) {
    const match = execPattern(pattern, content);
    if (match) return match;
  }
  return null;
}

function execPattern(pattern: RegExp, content: string): RegExpExecArray | null {
  const flags = pattern.flags.replace(/[gy]/g, "");
  return new RegExp(pattern.source, flags).exec(content);
}
