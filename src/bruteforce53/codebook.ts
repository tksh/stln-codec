/**
 * Codebook construction for frequent diff values.
 *
 * Encode maps each frequent value to one of the *last* codebook letters;
 * decode inverts that mapping.
 */
import { getAlphabetsForCodebook } from "bruteforce53/alphabets";

/** Cap the dictionary at `maxCodebookSize` entries. */
export function getActualCodebookSize(
  maxCodebookSize: number,
  freqDiffArr: readonly unknown[],
): number {
  return freqDiffArr.length >= maxCodebookSize
    ? maxCodebookSize
    : freqDiffArr.length;
}

/** Map frequent value → codeword letter. */
export function createCodebookToEnc(
  freqDiffArr: readonly number[],
): Map<number, string> {
  const letters = getAlphabetsForCodebook(freqDiffArr.length);
  const codebook = new Map<number, string>();
  for (let i = 0; i < freqDiffArr.length; i++) {
    const value = freqDiffArr[i];
    const letter = letters[i];
    if (value === undefined || letter === undefined) {
      throw new Error("createCodebookToEnc: unreachable index");
    }
    codebook.set(value, letter);
  }
  return codebook;
}

/** Map codeword letter → frequent value. */
export function createCodebookToDec(
  freqDiffArr: readonly number[],
  actualCodebookSize: number,
): Map<string, number> {
  const letters = getAlphabetsForCodebook(actualCodebookSize);
  const codebook = new Map<string, number>();
  for (let i = 0; i < freqDiffArr.length; i++) {
    const value = freqDiffArr[i];
    const letter = letters[i];
    if (value === undefined || letter === undefined) {
      throw new Error("createCodebookToDec: unreachable index");
    }
    codebook.set(letter, value);
  }
  return codebook;
}
