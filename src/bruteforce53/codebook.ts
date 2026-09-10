/**
 * Codebook construction for frequent diff values.
 *
 * Encode maps each frequent value to one of the *last* codebook letters;
 * decode inverts that mapping.
 */
import { zip } from "@std/collections/zip";
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
  const letters = [...getAlphabetsForCodebook(freqDiffArr.length)];
  if (letters.length !== freqDiffArr.length) {
    throw new Error("createCodebookToEnc: codebook length mismatch");
  }
  return new Map(zip(freqDiffArr, letters));
}

/** Map codeword letter → frequent value. */
export function createCodebookToDec(
  freqDiffArr: readonly number[],
  actualCodebookSize: number,
): Map<string, number> {
  const letters = [...getAlphabetsForCodebook(actualCodebookSize)];
  if (letters.length !== freqDiffArr.length) {
    throw new Error("createCodebookToDec: codebook length mismatch");
  }
  return new Map(zip(letters, freqDiffArr));
}
