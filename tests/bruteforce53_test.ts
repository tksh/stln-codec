import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  getAlphabets52,
  getAlphabetsForBaseX,
  getAlphabetsForCodebook,
} from "../src/bruteforce53/alphabets.ts";
import { baseXDec, baseXEnc } from "../src/bruteforce53/base_x.ts";
import {
  bruteforce53Dec,
  calculateDiffLimits,
  encodeBruteforce53Diffs,
} from "../src/bruteforce53/bruteforce53.ts";
import {
  createCodebookToDec,
  createCodebookToEnc,
  getActualCodebookSize,
} from "../src/bruteforce53/codebook.ts";
import {
  decodeDiff,
  diffToRel,
  handleBase52EncodingWithPrefix,
} from "../src/bruteforce53/diff.ts";
import {
  decodeFreqDiff,
  encodeFreqDiff,
} from "../src/bruteforce53/freq_diff.ts";
import {
  addNumBeforeEncode,
  addToEliminateNegativeBeforeEncode,
  calculateMinimumPossibleDiffValueFromUintN,
  getHalfOfBaseXRange,
  subtractNumAfterDecode,
  subtractToRestoreOriginalAfterDecode,
} from "../src/bruteforce53/shift.ts";
import type { AggregatedLinesData, CoordRows } from "../src/types.ts";

Deno.test("alphabet slices match the documented examples", () => {
  assertStrictEquals(
    getAlphabets52(),
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  );
  assertStrictEquals(getAlphabetsForCodebook(0), "");
  assertStrictEquals(getAlphabetsForCodebook(1), "Z");
  assertStrictEquals(
    getAlphabetsForCodebook(52),
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  );
  assertStrictEquals(getAlphabetsForBaseX(0), "");
  assertStrictEquals(getAlphabetsForBaseX(1), "a");
  assertStrictEquals(getAlphabetsForBaseX(8), "abcdefgh");
});

Deno.test("shift helpers invert each other", () => {
  assertStrictEquals(calculateMinimumPossibleDiffValueFromUintN(5), -62);
  assertStrictEquals(calculateMinimumPossibleDiffValueFromUintN(8), -510);
  assertStrictEquals(getHalfOfBaseXRange(0), 0);
  assertStrictEquals(getHalfOfBaseXRange(2), 2);
  assertStrictEquals(getHalfOfBaseXRange(52), 1352);
  for (const baseX of [2, 8, 26, 52]) {
    const half = getHalfOfBaseXRange(baseX);
    // Only the shifted bands are invertible; [0-9] stay bare digits upstream
    // and anything outside [−half, half + 9] takes the base52 path.
    const band = [0 - half, 0 - half + 1, -1, 10, 11, half + 8, half + 9]
      .filter((v) => v < 0 || v > 9);
    for (const value of band) {
      const shifted = addNumBeforeEncode(value, baseX);
      assertStrictEquals(typeof shifted, "number", `shift ${value}@${baseX}`);
      assertStrictEquals(
        subtractNumAfterDecode(shifted as number, baseX),
        value,
      );
    }
    assertStrictEquals(addNumBeforeEncode(0 - half - 1, baseX), undefined);
    assertStrictEquals(addNumBeforeEncode(half + 10, baseX), undefined);
  }
  for (const uintN of [5, 7, 8]) {
    for (const value of [-100, -1, 0, 7, 200]) {
      assertStrictEquals(
        subtractToRestoreOriginalAfterDecode(
          addToEliminateNegativeBeforeEncode(value, uintN),
          uintN,
        ),
        value,
      );
    }
  }
  assertEquals(calculateDiffLimits(5), { min: -124, max: 124 });
});

Deno.test("baseX round-trips in-range diffs", () => {
  for (const baseX of [2, 8, 26, 52]) {
    const half = getHalfOfBaseXRange(baseX);
    const values = [0 - half, 0 - half + 1, -1, 10, 11, half + 8, half + 9]
      .filter((v) => v < 0 || v > 9);
    for (const value of values) {
      const encoded = baseXEnc(value, baseX);
      assertStrictEquals(encoded.length, 2, `${value}@${baseX}`);
      assertStrictEquals(baseXDec(encoded, baseX), value);
    }
  }
  assertThrows(() => baseXEnc(5, 52), Error); // bare digits never reach baseX
  assertThrows(() => baseXDec("!!", 52), Error);
});

Deno.test("freq dictionary round-trips", () => {
  assertStrictEquals(getActualCodebookSize(0, []), 0);
  assertStrictEquals(getActualCodebookSize(52, []), 0);
  assertStrictEquals(getActualCodebookSize(2, [-1, -2, -3]), 2);
  assertStrictEquals(getActualCodebookSize(5, [-1, -2]), 2);
  assertEquals(createCodebookToEnc([-2, -1]), new Map([[-2, "Y"], [-1, "Z"]]));
  assertEquals(
    createCodebookToDec([-2, -1], 2),
    new Map([["Y", -2], ["Z", -1]]),
  );
  // Dictionary values must fit the uintN diff range ([minDiff, −minDiff]).
  const inRange: Array<[number, number[]]> = [
    [5, [-62, -15, -1, 0, 9, 62]],
    [7, [-254, -100, -1, 0, 9, 200, 254]],
    [8, [-510, -100, -1, 0, 9, 200, 510]],
  ];
  for (const [uintN, values] of inRange) {
    assertEquals(decodeFreqDiff(encodeFreqDiff(values, uintN), uintN), values);
  }
  assertEquals(decodeFreqDiff("", 5), []);
});

Deno.test("diffToRel reconstructs running sums", () => {
  assertEquals(diffToRel([11, -10]), [11, 1]);
  assertEquals(diffToRel([1, 3, -2]), [1, 4, 2]);
});

Deno.test("handler chain prefers digits, codebook, base52, then baseX", () => {
  // Out-of-range magnitudes take the base52 path with underscore prefixes.
  const limits = {
    baseXSkipRangeLowerLimit: -1353,
    baseXSkipRangeUpperLimit: 1362,
  };
  const over = handleBase52EncodingWithPrefix(2000, limits);
  assertStrictEquals(typeof over, "string");
  assertStrictEquals(handleBase52EncodingWithPrefix(5, limits), undefined);
});

function aggDiffs(
  g_id: number,
  rows: CoordRows,
  freq: CoordRows,
): AggregatedLinesData {
  const counts = { x1: [], y1: [], x2: [], y2: [] };
  return {
    g_id,
    stroke_width: { widths: [1], counts: [rows.x1.length] },
    d: {
      absolute: {
        diff_by_row: { ...counts },
        frequent_diff_values_sorted: { ...counts },
        frequent_diff_counts_sorted: { ...counts },
      },
      relative: {
        diff_by_row: rows,
        frequent_diff_values_sorted: freq,
        frequent_diff_counts_sorted: { ...counts },
      },
    },
  };
}

const EMPTY_ROWS: CoordRows = { x1: [], y1: [], x2: [], y2: [] };

Deno.test("bruteforce53 round-trips diff tables without a dictionary", () => {
  const rows: CoordRows = {
    x1: [0, 5, -3, 20],
    y1: [-40, 100, 9, 10],
    x2: [-1352, 1361, 1, -1],
    y2: [2, -2, 0, 7],
  };
  const groups = [aggDiffs(0, rows, EMPTY_ROWS)];
  const encoded = encodeBruteforce53Diffs(groups, 5, 52);
  const payload = encoded.get(0) as string;
  assertEquals(bruteforce53Dec(payload, 5), [
    rows.x1,
    rows.y1,
    rows.x2,
    rows.y2,
  ]);
});

Deno.test("bruteforce53 round-trips diff tables with a dictionary", () => {
  const rows: CoordRows = {
    x1: [7, -1, 10, -1, -3],
    y1: [0, -1, 5, -1, 9],
    x2: [3, 3, -2, 4, -1],
    y2: [1, 2, 3, 4, 5],
  };
  const freq: CoordRows = { x1: [-1, -3], y1: [-1], x2: [], y2: [] };
  const groups = [aggDiffs(0, rows, freq)];
  // baseX 47 ↔ maxCodebook 5 covers the 2-entry dictionary on both sides.
  const encoded = encodeBruteforce53Diffs(groups, 5, 47);
  const payload = encoded.get(0) as string;
  assertEquals(bruteforce53Dec(payload, 5), [
    rows.x1,
    rows.y1,
    rows.x2,
    rows.y2,
  ]);
});

Deno.test("bruteforce53 caps the dictionary at 52 - baseX", () => {
  const rows: CoordRows = {
    x1: [7, -1, 10],
    y1: [0, 5, -1],
    x2: [3, 3, 4],
    y2: [1, 2, 3],
  };
  // baseX 52 ↔ cap 0: the 3-entry list is dropped on both sides, so the
  // payload stays decodable (previously the encoder kept all 3 entries while
  // the decoder built an empty codebook).
  const freq: CoordRows = {
    x1: [-1, -3, -5],
    y1: [-1, -2, -3],
    x2: [-1],
    y2: [],
  };
  const payload = encodeBruteforce53Diffs([aggDiffs(0, rows, freq)], 5, 52).get(
    0,
  ) as string;
  assertEquals(bruteforce53Dec(payload, 5), [
    rows.x1,
    rows.y1,
    rows.x2,
    rows.y2,
  ]);
});

Deno.test("decodeDiff rejects undecodable input", () => {
  assertThrows(() => decodeDiff("!!", new Map(), 52), Error);
  assertThrows(() => bruteforce53Dec("", 5), Error);
  assertThrows(() => bruteforce53Dec("Z", 5), Error);
});
