/**
 * Per-value diff handlers: bare `[0-9]` digits, codebook hits, base-52 with
 * underscore prefixes for out-of-range magnitudes, and two-letter base-X.
 */
import { base52Dec, base52Enc } from "base-n/base52";
import { baseXDec, baseXEnc } from "bruteforce53/base-x";
import { getHalfOfBaseXRange } from "bruteforce53/shift";

/** Leave `[0-9]` as bare digits. */
export function handleSingleDigit(diff: number): number | undefined {
  if (diff >= 0 && diff <= 9) return diff;
  return undefined;
}

/** Substitute a codebook letter for a frequent diff value. */
export function handleFrequencyDiff(
  diff: number,
  codebook: ReadonlyMap<number, string>,
): string | undefined {
  return codebook.get(diff);
}

/** Diff range within which base-X applies; outside it base-52 takes over. */
export interface BaseXSkipLimits {
  baseXSkipRangeLowerLimit: number;
  baseXSkipRangeUpperLimit: number;
}

/** Derive the skip limits for a base-X number. */
export function calculateLimitsForBaseXSkipRange(
  baseXNumber: number,
): BaseXSkipLimits {
  const start = 0 - getHalfOfBaseXRange(baseXNumber);
  const end = getHalfOfBaseXRange(baseXNumber) + 9;
  return {
    baseXSkipRangeLowerLimit: start - 1,
    baseXSkipRangeUpperLimit: end + 1,
  };
}

function underscorePrefixLength(
  encodedLength: number,
  isPositive: boolean,
): number {
  const base = (encodedLength - 1) * 2;
  return isPositive ? base - 1 : base;
}

/**
 * Base-52 with underscore prefixes for magnitudes outside the base-X range.
 * Prefix length encodes sign and payload length (see module docs in pfpg).
 */
export function handleBase52EncodingWithPrefix(
  diff: number,
  limits: BaseXSkipLimits,
): string | undefined {
  if (
    diff <= limits.baseXSkipRangeLowerLimit ||
    limits.baseXSkipRangeUpperLimit <= diff
  ) {
    const payload = base52Enc(Math.abs(diff)).padStart(2, "a");
    return "_".repeat(underscorePrefixLength(payload.length, diff > 0)) +
      payload;
  }
  return undefined;
}

/** Two-letter base-X encoding for the remaining in-range diffs. */
export function handleBaseXEncoding(diff: number, baseXNumber: number): string {
  return baseXEnc(diff, baseXNumber);
}

/** Encode one diff through the handler chain (single digit → base-X). */
export function encodeOneDiff(
  diff: number,
  codebook: ReadonlyMap<number, string>,
  baseXNumber: number,
  limits: BaseXSkipLimits,
): number | string {
  return handleSingleDigit(diff) ??
    handleFrequencyDiff(diff, codebook) ??
    handleBase52EncodingWithPrefix(diff, limits) ??
    handleBaseXEncoding(diff, baseXNumber);
}

/** Decode a diff body string back to values. */
export function decodeDiff(
  diffStr: string,
  codebook: ReadonlyMap<string, number>,
  baseX: number,
): number[] {
  const codebookChars = new Set(codebook.keys());
  const decoded: number[] = [];
  let i = 0;
  while (i < diffStr.length) {
    const ch = diffStr[i];
    if (ch === undefined) throw new Error("decodeDiff: unreachable index");
    if (codebookChars.has(ch)) {
      const value = codebook.get(ch);
      if (value === undefined) throw new Error("decodeDiff: codebook miss");
      decoded.push(value);
      i++;
    } else if (/^[0-9]$/.test(ch)) {
      decoded.push(parseInt(ch, 10));
      i++;
    } else if (ch === "_") {
      let underscores = 0;
      while (diffStr[i] === "_" && i < diffStr.length) {
        underscores++;
        i++;
      }
      // Odd prefixes mark positive payloads, even ones negative payloads.
      const payloadLength = underscores % 2 === 1
        ? Math.floor(underscores / 2) + 2
        : underscores / 2 + 1;
      const payload = diffStr.slice(i, i + payloadLength);
      decoded.push(
        underscores % 2 === 1 ? base52Dec(payload) : -base52Dec(payload),
      );
      i += payloadLength;
    } else {
      decoded.push(baseXDec(diffStr.slice(i, i + 2), baseX));
      i += 2;
    }
  }
  return decoded;
}

/** Running-sum reconstruction: diffs back to relative values. */
export function diffToRel(diffArray: readonly (number | string)[]): number[] {
  const original: number[] = [];
  diffArray.forEach((diff, index) => {
    const value = typeof diff === "number" ? diff : parseInt(diff, 10);
    if (!Number.isFinite(value)) {
      throw new Error(`diffToRel: invalid diff ${JSON.stringify(diff)}`);
    }
    original.push(
      index === 0 ? value : (original[index - 1] as number) + value,
    );
  });
  return original;
}
