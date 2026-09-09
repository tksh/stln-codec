/**
 * bruteforce53 d-value codec: per-coordinate frequency dictionaries plus
 * mixed single-digit / codebook / base-52 / base-X diff payloads.
 *
 * Payload layout: `[base53(baseX)]-[x1freq]-[x1diff]-…-[y2freq]-[y2diff]`.
 *
 * The dictionary size is capped at the max-codebook size (`52 − baseX`),
 * matching what the decoder derives from the payload's first char. (An
 * earlier revision passed `baseXNumber` here, producing payloads the decoder
 * could not reconstruct whenever the list was longer than the cap.)
 */
import { base53Dec, base53Enc } from "../base-n/base53.ts";
import type { AggregatedLinesData } from "../types.ts";
import {
  createCodebookToDec,
  createCodebookToEnc,
  getActualCodebookSize,
} from "./codebook.ts";
import {
  calculateLimitsForBaseXSkipRange,
  decodeDiff,
  encodeOneDiff,
} from "./diff.ts";
import { decodeFreqDiff, encodeFreqDiff } from "./freq_diff.ts";

const COORDS = ["x1", "y1", "x2", "y2"] as const;
type Coord = typeof COORDS[number];

/** Diff range reachable under `uintN` (base-X skip-range input). */
export function calculateDiffLimits(
  uintN: number,
): { min: number; max: number } {
  const span = (2 ** uintN - 1) * 4;
  return { min: 0 - span, max: span };
}

/**
 * Encode relative diff tables to per-group payload strings (no compression,
 * no flags — see the compress stage). Pure core of pfpg's `bruteforce53Enc`
 * inner loop for one `baseXNumber`.
 */
export function encodeBruteforce53Diffs(
  aggGroups: Iterable<AggregatedLinesData>,
  uintN: number,
  baseXNumber: number,
): Map<number, string> {
  const limits = calculateLimitsForBaseXSkipRange(baseXNumber);
  const encoded = new Map<number, string>();
  for (const agg of aggGroups) {
    const perCoord = COORDS.map((coord: Coord) => {
      const diffArr = agg.d.relative.diff_by_row[coord];
      const freqArr = agg.d.relative.frequent_diff_values_sorted[coord];
      const actualSize = getActualCodebookSize(52 - baseXNumber, freqArr);
      const codebook = createCodebookToEnc(freqArr.slice(0, actualSize));
      const freqEncoded = encodeFreqDiff(freqArr.slice(0, actualSize), uintN);
      const diffEncoded = diffArr
        .map((diff) => encodeOneDiff(diff, codebook, baseXNumber, limits))
        .join("");
      return `${freqEncoded}-${diffEncoded}`;
    });
    encoded.set(agg.g_id, base53Enc(baseXNumber) + perCoord.join("-"));
  }
  return encoded;
}

/** Decode a payload to per-coordinate diff arrays `[x1, y1, x2, y2]`. */
export function bruteforce53Dec(
  encodedDvalsStr: string,
  uintN: number,
): number[][] {
  const first = encodedDvalsStr[0];
  if (first === undefined) throw new Error("bruteforce53Dec: empty input");
  const baseX = base53Dec(first);
  const maxCodebookSize = 52 - baseX;
  const parts = encodedDvalsStr.slice(1).split("-");
  const freqByCoords: string[] = [];
  const diffByCoords: string[] = [];
  parts.forEach((part, index) => {
    (index % 2 === 0 ? freqByCoords : diffByCoords).push(part);
  });
  if (freqByCoords.length !== 4 || diffByCoords.length !== 4) {
    throw new Error("bruteforce53Dec: expected four coordinates");
  }
  return COORDS.map((_, i) => {
    const freqStr = freqByCoords[i] as string;
    const diffStr = diffByCoords[i] as string;
    const freqValues = decodeFreqDiff(freqStr, uintN);
    const actualSize = getActualCodebookSize(maxCodebookSize, freqValues);
    const codebook = createCodebookToDec(freqValues, actualSize);
    return decodeDiff(diffStr, codebook, baseX);
  });
}
