/**
 * four16 d-value codec: custom base-16 over four 16-char sets. Values in
 * `[0:15]`/`[-15:-1]` take one char, `[16:255]`/`[-255:-16]` take two.
 *
 * Encode input depends on `uintN`: diff-by-row tables at ≤7 (UInt7Portray),
 * relative d-values at 8 (UInt8Portray). Decode mirrors that split, mapping
 * diffs back through `diffToRel` at ≤7.
 */
import { chunk } from "@std/collections/chunk";
import { diffToRel } from "bruteforce53/diff";
import { getFour16CharsSets } from "base-n/chars";
import type { Four16CharSets } from "base-n/chars";
import type { AggregatedLinesData, DvalQuad, LineGroup } from "types";

const COORDS = ["x1", "y1", "x2", "y2"] as const;
type Coord = typeof COORDS[number];

/** Base-16 encode over a custom 16-char set. */
export function customBase16Enc(num: number, charsSet: string): string {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(
      `customBase16Enc: expected non-negative integer, got ${num}`,
    );
  }
  const zero = charsSet[0];
  if (zero === undefined) throw new Error("customBase16Enc: empty charset");
  if (num === 0) return zero;
  let encoded = "";
  let rest = num;
  while (rest > 0) {
    const remainder = rest % 16;
    rest = Math.floor(rest / 16);
    const ch = charsSet[remainder];
    if (ch === undefined) {
      throw new Error("customBase16Enc: remainder out of range");
    }
    encoded = ch + encoded;
  }
  return encoded;
}

/** Base-16 decode over a custom 16-char set. */
export function customBase16Dec(symbol: string, charsSet: string): number {
  let decoded = 0;
  for (let i = 0; i < symbol.length; i++) {
    const ch = symbol[i];
    if (ch === undefined) throw new Error("customBase16Dec: unreachable index");
    const index = charsSet.indexOf(ch);
    if (index === -1) {
      throw new Error(
        `customBase16Dec: invalid character ${JSON.stringify(ch)}`,
      );
    }
    decoded += index * Math.pow(16, symbol.length - i - 1);
  }
  return decoded;
}

function encodeOne(
  num: number,
  sets: ReturnType<typeof getFour16CharsSets>,
): string {
  if (num >= 0 && num <= 15) return customBase16Enc(num, sets.p1);
  if (num >= -15 && num <= -1) return customBase16Enc(Math.abs(num), sets.n1);
  if (num >= 16 && num <= 255) return customBase16Enc(num, sets.p2);
  if (num >= -255 && num <= -16) return customBase16Enc(Math.abs(num), sets.n2);
  throw new Error(
    `encodeCoordsWithFourBase16: ${num} out of range [-255, 255]`,
  );
}

/** Encode one coordinate mapping (`{x1,…}`) to its payload string. */
export function encodeCoordsWithFourBase16(
  coords: Record<Coord, readonly number[]>,
  charsSets: Four16CharSets = getFour16CharsSets(),
): string {
  let payload = "";
  for (const coord of COORDS) {
    for (const num of coords[coord]) payload += encodeOne(num, charsSets);
  }
  return payload;
}

/** Decode a payload to the flat value list (signs restored). */
export function decodeFourBase16Coords(str: string): Array<number | string> {
  const sets = getFour16CharsSets();
  const values: Array<number | string> = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === undefined) {
      throw new Error("decodeFourBase16Coords: unreachable index");
    }
    if (sets.p1.includes(ch)) {
      values.push(customBase16Dec(ch, sets.p1));
      i++;
    } else if (sets.n1.includes(ch)) {
      values.push("-" + customBase16Dec(ch, sets.n1));
      i++;
    } else if (sets.p2.includes(ch)) {
      const pair = str.slice(i, i + 2);
      if (pair.length !== 2) {
        throw new Error("decodeFourBase16Coords: truncated pair");
      }
      values.push(customBase16Dec(pair, sets.p2));
      i += 2;
    } else if (sets.n2.includes(ch)) {
      const pair = str.slice(i, i + 2);
      if (pair.length !== 2) {
        throw new Error("decodeFourBase16Coords: truncated pair");
      }
      values.push("-" + customBase16Dec(pair, sets.n2));
      i += 2;
    } else {
      throw new Error(
        `decodeFourBase16Coords: invalid character ${JSON.stringify(ch)}`,
      );
    }
  }
  return values;
}

/**
 * Encode per-group payloads: aggregated diff tables at `uintN ≤ 7`,
 * relative d-values at `uintN === 8`.
 */
export function encodeFour16Dvals(
  groups: Iterable<LineGroup | AggregatedLinesData>,
  uintN: number,
): Map<number, string> {
  const sets = getFour16CharsSets();
  const encoded = new Map<number, string>();
  for (const group of groups) {
    const coords = uintN <= 7
      ? (group as AggregatedLinesData).d.relative.diff_by_row
      : (group as LineGroup).d.relative;
    if (coords === undefined || uintN > 8) {
      throw new Error(
        "encodeFour16Dvals: supports UInt7Portray (agg diffs) and UInt8Portray (relative)",
      );
    }
    encoded.set(group.g_id, encodeCoordsWithFourBase16(coords, sets));
  }
  return encoded;
}

/** Decode a payload to relative d-values as `[x1, y1, x2, y2]`. */
export function four16Dec(encodedDvalsStr: string, uintN: number): DvalQuad {
  const flat = decodeFourBase16Coords(encodedDvalsStr);
  if (flat.length % 4 !== 0) {
    throw new Error("four16Dec: value count not divisible by four");
  }
  const parts = chunk(flat, flat.length / 4);
  const quad: DvalQuad = [[], [], [], []];
  for (let c = 0; c < 4; c++) {
    const part = parts[c];
    const target = quad[c];
    if (part === undefined || target === undefined) {
      throw new Error("four16Dec: unreachable index");
    }
    const numbers = part.map((v) =>
      typeof v === "number" ? v : parseInt(v, 10)
    );
    if (numbers.some((n) => !Number.isFinite(n))) {
      throw new Error("four16Dec: invalid value");
    }
    target.push(...(uintN <= 7 ? diffToRel(numbers) : numbers));
  }
  return quad;
}
