/**
 * Base-X codec: two-letter codes over the first `baseX` of 52 letters.
 *
 * Values are pre-shifted non-negative (see `shift.ts`) and padded to two
 * digits with `a`.
 */
import { getAlphabets52, getAlphabetsForBaseX } from "./alphabets.ts";
import { addNumBeforeEncode, subtractNumAfterDecode } from "./shift.ts";

/** Encode a diff as two base-X letters; throws when out of range. */
export function baseXEnc(numOriginal: number, baseX: number): string {
  const shifted = addNumBeforeEncode(numOriginal, baseX);
  if (shifted === undefined) {
    throw new Error(`baseXEnc: ${numOriginal} out of base${baseX} range`);
  }
  const alphabet = getAlphabetsForBaseX(baseX);
  const zero = alphabet[0];
  if (zero === undefined) throw new Error("baseXEnc: empty alphabet");
  if (shifted === 0) return zero + zero;
  const base = alphabet.length;
  let num = shifted;
  let encoded = "";
  while (num > 0) {
    const remainder = num % base;
    num = Math.floor(num / base);
    const ch = alphabet[remainder];
    if (ch === undefined) throw new Error("baseXEnc: remainder out of range");
    encoded = ch + encoded;
  }
  if (encoded.length === 1) encoded = encoded.padStart(2, "a");
  return encoded;
}

/** Decode two base-X letters back to a diff; throws on invalid input. */
export function baseXDec(str: string, baseX: number): number {
  const alphabet = getAlphabets52().substring(0, baseX);
  const base = alphabet.length;
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === undefined) throw new Error("baseXDec: unreachable index");
    const index = alphabet.indexOf(ch);
    if (index === -1) {
      throw new Error(`baseXDec: invalid character ${JSON.stringify(ch)}`);
    }
    decoded += index * Math.pow(base, str.length - i - 1);
  }
  const restored = subtractNumAfterDecode(decoded, baseX);
  if (restored === undefined) {
    throw new Error(
      `baseXDec: ${JSON.stringify(str)} out of base${baseX} range`,
    );
  }
  return restored;
}
