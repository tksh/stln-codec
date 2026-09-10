/**
 * bigint64 d-value codec: absolute coordinates zero-padded to a fixed width,
 * joined, and encoded as one base-64url bigint per group.
 *
 * `uintN` is an explicit parameter; pfpg reads it from the basic-data
 * textarea (encode) or URL params (decode).
 *
 * NOTE: pfpg splits the padded string with `@std/collections` `chunk`, which
 * since 1.x yields single characters for string input (so upstream decode
 * now maps those to `NaN`). The documented vectors in pfpg's `bigint64-dec.js`
 * show the intended substring chunks, which is what this port implements.
 */
import { base64UrlDec, base64UrlEnc } from "base-n/base64url";
import type { DecodedWidthsAndCounts, DvalQuad, LineGroup } from "types";

const COORDS = ["x1", "y1", "x2", "y2"] as const;
type Coord = typeof COORDS[number];

/** Decimal digits needed for the largest absolute value under `uintN`. */
export function getDigitsPerChunk(uintN: number): number {
  return String(2 ** uintN - 1).length;
}

/** Round `number` up to a multiple of `multiple * 4`. */
export function findNearestMultipleOfFourX(
  number: number,
  multiple: number,
): number {
  return Math.ceil(number / (multiple * 4)) * (multiple * 4);
}

/** Restore leading zeros lost in the bigint conversion. */
export function recoverOriginalZeroPadding(
  bigintAsStr: string,
  digitsPerChunk: number,
): string {
  const paddedLength = findNearestMultipleOfFourX(
    bigintAsStr.length,
    digitsPerChunk,
  );
  return bigintAsStr.length === paddedLength
    ? bigintAsStr
    : bigintAsStr.padStart(paddedLength, "0");
}

/** Encode absolute d-values to per-group base-64url payloads. */
export function encodeBigint64Dvals(
  linesGroups: Iterable<LineGroup>,
  uintN: number,
): Map<number, string> {
  const digits = getDigitsPerChunk(uintN);
  const encoded = new Map<number, string>();
  for (const group of linesGroups) {
    let joined = "";
    for (const coord of COORDS) {
      joined += group.d.absolute[coord].map((n) =>
        String(n).padStart(digits, "0")
      ).join("");
    }
    encoded.set(group.g_id, base64UrlEnc(BigInt(joined)));
  }
  return encoded;
}

/** Decode a payload to absolute d-values as `[x1, y1, x2, y2]`. */
export function bigint64Dec(encodedDvalsStr: string, uintN: number): DvalQuad {
  const digits = getDigitsPerChunk(uintN);
  const padded = recoverOriginalZeroPadding(
    String(base64UrlDec(encodedDvalsStr)),
    digits,
  );
  if (padded.length % 4 !== 0) {
    throw new Error("bigint64Dec: padded length not divisible by four");
  }
  const quarter = padded.length / 4;
  if (quarter % digits !== 0) {
    throw new Error(
      "bigint64Dec: coordinate length not a multiple of digits per chunk",
    );
  }
  const quad: DvalQuad = [[], [], [], []];
  for (let c = 0; c < 4; c++) {
    const part = padded.substring(quarter * c, quarter * (c + 1));
    const target = quad[c];
    if (target === undefined) throw new Error("bigint64Dec: unreachable index");
    for (let k = 0; k < part.length; k += digits) {
      const piece = part.substring(k, k + digits);
      const value = Number(piece);
      if (!Number.isInteger(value)) {
        throw new Error(`bigint64Dec: invalid chunk ${JSON.stringify(piece)}`);
      }
      target.push(value);
    }
  }
  return quad;
}

/** Absolute → relative coordinates, restarting at each width run's first line. */
export function absToRel(
  absoluteDvals: DvalQuad,
  widthsAndCounts: DecodedWidthsAndCounts,
): DvalQuad {
  const firstline = new Set(widthsAndCounts.firstlineIndices.map((n) => n - 1));
  const [x1Arr, y1Arr, x2Arr, y2Arr] = absoluteDvals;
  const flat: number[] = [];
  let prevX2 = 0;
  let prevY2 = 0;
  const count = x1Arr?.length ?? 0;
  for (let i = 0; i < count; i++) {
    const x1 = x1Arr?.[i];
    const y1 = y1Arr?.[i];
    const x2 = x2Arr?.[i];
    const y2 = y2Arr?.[i];
    if (
      x1 === undefined || y1 === undefined || x2 === undefined ||
      y2 === undefined
    ) {
      throw new Error("absToRel: ragged coordinate arrays");
    }
    if (firstline.has(i)) {
      flat.push(x1, y1, x2 - x1, y2 - y1);
    } else {
      flat.push(x1 - prevX2, y1 - prevY2, x2 - x1, y2 - y1);
    }
    prevX2 = x2;
    prevY2 = y2;
  }
  const quad: DvalQuad = [[], [], [], []];
  for (let i = 0; i < flat.length / 4; i++) {
    for (let c = 0; c < 4; c++) {
      const value = flat[i * 4 + c];
      const target = quad[c];
      if (value === undefined || target === undefined) {
        throw new Error("absToRel: unreachable index");
      }
      target.push(value);
    }
  }
  return quad;
}

export type { Coord };
