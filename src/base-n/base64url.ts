/**
 * Base-64url codec over the RFC 4648 §5 alphabet, backed by `bigint`.
 *
 * Used by the bigint64 d-value codec for arbitrarily large integers.
 */
import { getBase64UrlCharacters } from "base-n/chars";

const ALPHABET64URL = getBase64UrlCharacters();

/** Encode a non-negative bigint as base-64url. */
export function base64UrlEnc(num: bigint): string {
  if (num < 0n) {
    throw new Error(`base64UrlEnc expects a non-negative bigint, got ${num}`);
  }
  const first = ALPHABET64URL[0];
  if (first === undefined) throw new Error("base64url alphabet is empty");
  if (num === 0n) return first;
  const base = BigInt(ALPHABET64URL.length);
  let encoded = "";
  while (num > 0n) {
    const remainder = num % base;
    num = num / base;
    const ch = ALPHABET64URL[Number(remainder)];
    if (ch === undefined) {
      throw new Error("base64UrlEnc: remainder out of range");
    }
    encoded = ch + encoded;
  }
  return encoded;
}

/** Decode a base-64url string to a bigint. */
export function base64UrlDec(str: string): bigint {
  const base = BigInt(ALPHABET64URL.length);
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === undefined) throw new Error("base64UrlDec: unreachable index");
    const index = ALPHABET64URL.indexOf(ch);
    if (index === -1) throw new Error("Invalid character");
    num = num * base + BigInt(index);
  }
  return num;
}
