/**
 * Additive shifts that keep encoded magnitudes non-negative.
 *
 * All helpers take `uintN` explicitly; the pfpg originals read it from the
 * basic-data textarea (encode) or from URL params (decode).
 */

/** Minimum diff value reachable under `uintN` (e.g. −62 for 5). */
export function calculateMinimumPossibleDiffValueFromUintN(
  uintN: number,
): number {
  const maximumRelativeDValue = 2 ** uintN - 1;
  const minimumRelativeDValue = 0 - maximumRelativeDValue;
  return minimumRelativeDValue - maximumRelativeDValue;
}

/** Shift a diff value fully non-negative before base-52 encoding. */
export function addToEliminateNegativeBeforeEncode(
  num: number,
  uintN: number,
): number {
  return num + Math.abs(calculateMinimumPossibleDiffValueFromUintN(uintN));
}

/** Undo the shift above after base-52 decoding. */
export function subtractToRestoreOriginalAfterDecode(
  num: number,
  uintN: number,
): number {
  return num - Math.abs(calculateMinimumPossibleDiffValueFromUintN(uintN));
}

/** Half the two-digit base-X range: `floor(baseX² / 2)`. */
export function getHalfOfBaseXRange(baseX: number): number {
  return Math.trunc(baseX ** 2 / 2);
}

function getNumToShift(
  baseX: number,
): { forBefore0: number; forAfter9: number } {
  const half = getHalfOfBaseXRange(baseX);
  return { forBefore0: half, forAfter9: half - 10 };
}

/**
 * Shift a diff into the non-negative base-X digit space.
 * Returns `undefined` for `[0-9]` (handled as bare digits upstream).
 */
export function addNumBeforeEncode(
  num: number,
  baseX: number,
): number | undefined {
  const shift = getNumToShift(baseX);
  const half = getHalfOfBaseXRange(baseX);
  if (0 - half <= num && num <= -1) return num + shift.forBefore0;
  if (10 <= num && num <= half + 9) return num + shift.forAfter9;
  return undefined;
}

/** Undo the shift above after base-X decoding. */
export function subtractNumAfterDecode(
  num: number,
  baseX: number,
): number | undefined {
  const shift = getNumToShift(baseX);
  const half = getHalfOfBaseXRange(baseX);
  if (shift.forBefore0 + (0 - half) <= num && num <= shift.forBefore0 + -1) {
    return num - shift.forBefore0;
  }
  if (shift.forAfter9 + 10 <= num && num <= shift.forAfter9 + half + 9) {
    return num - shift.forAfter9;
  }
  return undefined;
}
