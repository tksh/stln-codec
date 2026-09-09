/**
 * swap63 d-value codec: each relative value in `[-31, 31]` swaps to one of
 * 63 characters (`0-9a-zA-Z_`). For the ≤31 grid (UInt5Portray) only.
 */
import type { DvalQuad, LineGroup } from "../types.ts";

const MIN = -31;
const MAX = 31;

/** `[-31, 31]` as an array. */
export function get63Numbers(): number[] {
  const numbers: number[] = [];
  for (let i = MIN; i <= MAX; i++) numbers.push(i);
  return numbers;
}

/** `0-9a-zA-Z_` as an array. */
export function get63Characters(): string[] {
  const chars: string[] = [];
  for (let i = 0; i < 10; i++) chars.push(String(i));
  for (let i = 97; i <= 122; i++) chars.push(String.fromCharCode(i));
  for (let i = 65; i <= 90; i++) chars.push(String.fromCharCode(i));
  chars.push("_");
  return chars;
}

/** Zip keys to values as a lookup map. */
export function createCodebook<K, V>(
  keys: readonly K[],
  values: readonly V[],
): Map<K, V> {
  if (keys.length !== values.length) {
    throw new Error("createCodebook: length mismatch");
  }
  const codebook = new Map<K, V>();
  for (let i = 0; i < keys.length; i++) {
    codebook.set(keys[i] as K, values[i] as V);
  }
  return codebook;
}

const COORDS = ["x1", "y1", "x2", "y2"] as const;

/** Encode relative d-values to per-group character payloads. */
export function encodeSwap63Dvals(
  linesGroups: Iterable<LineGroup>,
): Map<number, string> {
  const toChar = createCodebook(get63Numbers(), get63Characters());
  const encoded = new Map<number, string>();
  for (const group of linesGroups) {
    let payload = "";
    for (const coord of COORDS) {
      for (const value of group.d.relative[coord]) {
        if (value < MIN || value > MAX) {
          throw new Error(`encodeSwap63Dvals: ${value} out of range [-31, 31]`);
        }
        const ch = toChar.get(value);
        if (ch === undefined) {
          throw new Error("encodeSwap63Dvals: codebook miss");
        }
        payload += ch;
      }
    }
    encoded.set(group.g_id, payload);
  }
  return encoded;
}

/** Decode a payload to relative d-values as `[x1, y1, x2, y2]`. */
export function swap63Dec(encodedDvalsStr: string): DvalQuad {
  const toNum = createCodebook(get63Characters(), get63Numbers());
  const partLength = Math.ceil(encodedDvalsStr.length / 4);
  const quad: DvalQuad = [[], [], [], []];
  for (let c = 0; c < 4; c++) {
    const part = encodedDvalsStr.slice(c * partLength, (c + 1) * partLength);
    const target = quad[c];
    if (target === undefined) throw new Error("swap63Dec: unreachable index");
    for (const ch of part) {
      const value = toNum.get(ch);
      if (value === undefined) {
        throw new Error(`swap63Dec: invalid character ${JSON.stringify(ch)}`);
      }
      target.push(value);
    }
  }
  return quad;
}
