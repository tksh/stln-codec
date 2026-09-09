/**
 * The 52-letter alphabet and its head/tail slices for bruteforce53 codebooks
 * and base-X encodings.
 */

const LOWER_START = 97; // "a"
const UPPER_START = 65; // "A"

/** 52 chars `a-zA-Z` (no digits, no `_`; those mark other token kinds). */
export function getAlphabets52(): string {
  let result = "";
  for (let i = 0; i < 26; i++) result += String.fromCharCode(LOWER_START + i);
  for (let i = 0; i < 26; i++) result += String.fromCharCode(UPPER_START + i);
  return result;
}

/** Last `codebookSize` letters, used as codewords for frequent diff values. */
export function getAlphabetsForCodebook(codebookSize: number): string {
  if (codebookSize === 0) return "";
  return getAlphabets52().slice(-codebookSize);
}

/** First `baseX` letters, used as digits for base-X encoding. */
export function getAlphabetsForBaseX(baseX: number): string {
  if (baseX === 0) return "";
  return getAlphabets52().substring(0, baseX);
}
