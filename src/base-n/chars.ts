/** Character tables for the base-N encodings. */

const LOWER_START = 97; // "a"
const UPPER_START = 65; // "A"

/** 53 chars: `"_"` followed by `a-zA-Z` (base-53, e.g. widths counts). */
export function getBase53Characters(): string {
  let result = "_";
  for (let i = 0; i < 26; i++) result += String.fromCharCode(LOWER_START + i);
  for (let i = 0; i < 26; i++) result += String.fromCharCode(UPPER_START + i);
  return result;
}

/** 64 chars: RFC 4648 §5 base64url alphabet (bigint64 codec). */
export function getBase64UrlCharacters(): string {
  let result = "";
  for (let i = 0; i < 26; i++) result += String.fromCharCode(UPPER_START + i);
  for (let i = 0; i < 26; i++) result += String.fromCharCode(LOWER_START + i);
  for (let i = 0; i < 10; i++) result += String(i);
  result += "-_";
  return result;
}

/** Four 16-char sets for the four16 codec. */
export interface Four16CharSets {
  /** Positive 1-digit `[0:15]`. */
  p1: string;
  /** Negative 1-digit `[-15:-1]`. */
  n1: string;
  /** Positive 2-digit `[16:255]`. */
  p2: string;
  /** Negative 2-digit `[-255:-16]`. */
  n2: string;
}

/** Four sets of 16 chars used by four16-enc. */
export function getFour16CharsSets(): Four16CharSets {
  let p1 = "";
  for (let i = 0; i < 16; i++) p1 += String.fromCharCode(LOWER_START + i);
  let n1 = "";
  for (let i = 0; i < 16; i++) n1 += String.fromCharCode(UPPER_START + i);
  let p2 = "";
  for (let i = 0; i < 10; i++) p2 += String.fromCharCode(LOWER_START + 16 + i);
  for (let i = 0; i < 6; i++) p2 += String(i);
  let n2 = "";
  for (let i = 0; i < 10; i++) n2 += String.fromCharCode(UPPER_START + 16 + i);
  for (let i = 6; i < 10; i++) n2 += String(i);
  n2 += "-_";
  return { p1, n1, p2, n2 };
}
