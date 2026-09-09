import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import type { AggModeData, AggregatedLinesData } from "../src/types.ts";
import {
  decodeWidthsAndCounts,
  encodeWidthsAndCounts,
} from "../src/widths-counts/mod.ts";

function agg(
  g_id: number,
  widths: number[],
  counts: number[],
): AggregatedLinesData {
  const rows = { x1: [], y1: [], x2: [], y2: [] };
  const empty: AggModeData = {
    diff_by_row: { ...rows },
    frequent_diff_values_sorted: { ...rows },
    frequent_diff_counts_sorted: { ...rows },
  };
  return {
    g_id,
    stroke_width: { widths, counts },
    d: {
      absolute: { ...empty },
      relative: { ...empty },
    },
  };
}

Deno.test("encodeWidthsAndCounts joins widths with base53 counts", () => {
  const encoded = encodeWidthsAndCounts([
    agg(0, [23], [2]),
    agg(1, [5, 3, 2, 1], [2, 4, 8, 55]),
  ]);
  assertStrictEquals(encoded.get(0), "23b");
  assertStrictEquals(encoded.get(1), "5b3d2h1ab");
});

Deno.test("encodeWidthsAndCounts rejects mismatched runs", () => {
  assertThrows(() => encodeWidthsAndCounts([agg(0, [1, 2], [1])]), Error);
});

Deno.test("decodeWidthsAndCounts restores runs and line indices", () => {
  assertEquals(decodeWidthsAndCounts("5b3d2h1ab"), {
    firstlineIndices: [1, 3, 7, 15],
    lastlineIndices: [2, 6, 14, 69],
    widths: [5, 3, 2, 1],
    counts: [2, 4, 8, 55],
  });
  assertEquals(decodeWidthsAndCounts("23b"), {
    firstlineIndices: [1],
    lastlineIndices: [2],
    widths: [23],
    counts: [2],
  });
  assertThrows(() => decodeWidthsAndCounts(""), Error);
});

Deno.test("widths and counts round-trip through encode and decode", () => {
  const groups = [agg(0, [23], [2]), agg(1, [5, 3, 2, 1], [2, 4, 8, 55])];
  const encoded = encodeWidthsAndCounts(groups);
  for (const group of groups) {
    const decoded = decodeWidthsAndCounts(encoded.get(group.g_id) as string);
    assertEquals(decoded.widths, group.stroke_width.widths);
    assertEquals(decoded.counts, group.stroke_width.counts);
  }
});
