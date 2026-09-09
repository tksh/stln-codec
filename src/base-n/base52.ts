/**
 * Base-52 codec over `a-zA-Z`.
 *
 * Used for bruteforce53 frequency-dictionary counts. Unlike the other
 * base-N codecs here, invalid input characters throw instead of silently
 * contributing `-1 * base^k` (see `base64UrlDec` for precedent).
 */

export const ALPHABET52 =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Encode a non-negative integer as base-52. */
export function base52Enc(num: number): string {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`base52Enc expects a non-negative integer, got ${num}`);
  }
  const first = ALPHABET52[0];
  if (first === undefined) throw new Error("ALPHABET52 is empty");
  if (num === 0) return first;
  const base = ALPHABET52.length;
  let encoded = "";
  while (num > 0) {
    const remainder = num % base;
    num = Math.floor(num / base);
    const ch = ALPHABET52[remainder];
    if (ch === undefined) throw new Error("base52Enc: remainder out of range");
    encoded = ch + encoded;
  }
  return encoded;
}

/** Decode a base-52 string to a non-negative integer. */
export function base52Dec(str: string): number {
  const base = ALPHABET52.length;
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === undefined) throw new Error("base52Dec: unreachable index");
    const index = ALPHABET52.indexOf(ch);
    if (index === -1) {
      throw new Error(`base52Dec: invalid character ${JSON.stringify(ch)}`);
    }
    decoded += index * Math.pow(base, str.length - i - 1);
  }
  return decoded;
}
