/**
 * Frequent-diff dictionary («reference dictionary») codec.
 *
 * Values are shift-encoded non-negative (see `shift.ts`), then base-52
 * encoded: 1–2 chars padded with `a` to length 2, longer payloads prefixed
 * with `(length − 2)` underscores.
 */
import { base52Dec, base52Enc } from "base-n/base52";
import {
  addToEliminateNegativeBeforeEncode,
  subtractToRestoreOriginalAfterDecode,
} from "bruteforce53/shift";

/** Encode frequent diff values to the joined dictionary string. */
export function encodeFreqDiff(
  freqDiffArr: readonly number[],
  uintN: number,
): string {
  return freqDiffArr.map((value) => base52EncodeForFreqDiff(value, uintN)).join(
    "",
  );
}

function base52EncodeForFreqDiff(num: number, uintN: number): string {
  const encoded = base52Enc(addToEliminateNegativeBeforeEncode(num, uintN));
  if (encoded.length > 2) return "_".repeat(encoded.length - 2) + encoded;
  return encoded.padStart(2, "a");
}

/** Decode one base-52 dictionary chunk back to a diff value. */
export function base52DecodeForFreqDiff(chunk: string, uintN: number): number {
  return subtractToRestoreOriginalAfterDecode(base52Dec(chunk), uintN);
}

/** Split the dictionary string into chunks and decode each (`[]` for empty). */
export function decodeFreqDiff(diffStr: string, uintN: number): number[] {
  if (!diffStr) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < diffStr.length) {
    const ch = diffStr[i];
    if (ch === undefined) throw new Error("decodeFreqDiff: unreachable index");
    if (ch === "_") {
      let underscores = 0;
      while (diffStr[i] === "_" && i < diffStr.length) {
        underscores++;
        i++;
      }
      chunks.push(diffStr.slice(i, i + underscores + 2));
      i += underscores + 2;
    } else {
      chunks.push(diffStr.slice(i, i + 2));
      i += 2;
    }
  }
  return chunks.map((chunk) => base52DecodeForFreqDiff(chunk, uintN));
}
