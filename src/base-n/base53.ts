/**
 * Base-53 codec over `_a-zA-Z`.
 *
 * Used for the bruteforce53 3rd flag and for stroke-width counts.
 * Invalid input characters throw (same policy as `base52Dec`).
 */
import { getBase53Characters } from "./chars.ts";

const ALPHABET53 = getBase53Characters();

/** Encode a non-negative integer as base-53. */
export function base53Enc(num: number): string {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`base53Enc expects a non-negative integer, got ${num}`);
  }
  const first = ALPHABET53[0];
  if (first === undefined) throw new Error("base53 alphabet is empty");
  if (num === 0) return first;
  const base = ALPHABET53.length;
  let encoded = "";
  while (num > 0) {
    const remainder = num % base;
    num = Math.floor(num / base);
    const ch = ALPHABET53[remainder];
    if (ch === undefined) throw new Error("base53Enc: remainder out of range");
    encoded = ch + encoded;
  }
  return encoded;
}

/** Decode a base-53 string to a non-negative integer. */
export function base53Dec(str: string): number {
  const base = ALPHABET53.length;
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === undefined) throw new Error("base53Dec: unreachable index");
    const index = ALPHABET53.indexOf(ch);
    if (index === -1) {
      throw new Error(`base53Dec: invalid character ${JSON.stringify(ch)}`);
    }
    decoded += index * Math.pow(base, str.length - i - 1);
  }
  return decoded;
}
