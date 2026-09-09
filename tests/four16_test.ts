import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  customBase16Dec,
  customBase16Enc,
  decodeFourBase16Coords,
  encodeCoordsWithFourBase16,
  encodeFour16Dvals,
  four16Dec,
} from "../src/four16/mod.ts";
import { getFour16CharsSets } from "../src/base-n/mod.ts";
import type {
  AggregatedLinesData,
  CoordRows,
  LineGroup,
} from "../src/types.ts";

const SETS = getFour16CharsSets();

Deno.test("custom base16 round-trips over each charset", () => {
  assertStrictEquals(customBase16Enc(0, SETS.p1), "a");
  assertStrictEquals(customBase16Enc(15, SETS.p1), "p");
  assertStrictEquals(customBase16Enc(16, SETS.p2), "rq");
  assertStrictEquals(customBase16Enc(255, SETS.p2), "55");
  assertStrictEquals(customBase16Dec("rq", SETS.p2), 16);
  assertStrictEquals(customBase16Dec("55", SETS.p2), 255);
  assertThrows(() => customBase16Enc(-1, SETS.p1), Error);
  assertThrows(() => customBase16Dec("!", SETS.p1), Error);
});

Deno.test("four16 encodes each magnitude band to its charset", () => {
  const rows: CoordRows = {
    x1: [0, 15, -1, -15],
    y1: [16, 255, -16, -255],
    x2: [1, 2, 3, 4],
    y2: [0, 0, 0, 0],
  };
  const payload = encodeCoordsWithFourBase16(rows);
  // Single-digit bands stay single chars; double-digit bands take two.
  assertStrictEquals(payload.length, 4 + 8 + 4 + 4);
  assertEquals(decodeFourBase16Coords(payload).map(String), [
    "0",
    "15",
    "-1",
    "-15",
    "16",
    "255",
    "-16",
    "-255",
    "1",
    "2",
    "3",
    "4",
    "0",
    "0",
    "0",
    "0",
  ]);
});

Deno.test("four16 rejects out-of-range magnitudes", () => {
  const rows: CoordRows = { x1: [256], y1: [0], x2: [0], y2: [0] };
  assertThrows(() => encodeCoordsWithFourBase16(rows), Error);
  assertThrows(() => decodeFourBase16Coords("!"), Error);
  assertThrows(() => decodeFourBase16Coords("q"), Error);
});

function aggGroup(g_id: number, diffs: CoordRows): AggregatedLinesData {
  const empty: CoordRows = { x1: [], y1: [], x2: [], y2: [] };
  return {
    g_id,
    stroke_width: { widths: [1], counts: [diffs.x1.length] },
    d: {
      absolute: {
        diff_by_row: { ...empty },
        frequent_diff_values_sorted: { ...empty },
        frequent_diff_counts_sorted: { ...empty },
      },
      relative: {
        diff_by_row: diffs,
        frequent_diff_values_sorted: { ...empty },
        frequent_diff_counts_sorted: { ...empty },
      },
    },
  };
}

function lineGroup(g_id: number, rel: CoordRows): LineGroup {
  const empty: CoordRows = { x1: [], y1: [], x2: [], y2: [] };
  return {
    g_id,
    g_stroke: { r: 0, g: 0, b: 0 },
    g_opacity: 255,
    g_stroke_opacity: 255,
    id: [g_id],
    stroke_width: [1],
    d: {
      absolute: { ...empty },
      relative: { x1: rel.x1, y1: rel.y1, x2: rel.x2, y2: rel.y2 },
    },
  };
}

Deno.test("four16 round-trips diffs at uintN 7 and relatives at uintN 8", () => {
  const diffs: CoordRows = {
    x1: [11, -10, 200, -200],
    y1: [0, -23, 15, -15],
    x2: [0, 0, 16, -16],
    y2: [23, 0, 255, -255],
  };
  const relOf = (rows: CoordRows): CoordRows => {
    const running = (arr: number[]): number[] => {
      const out: number[] = [];
      arr.forEach((v, i) => out.push(i === 0 ? v : (out[i - 1] as number) + v));
      return out;
    };
    return {
      x1: running(rows.x1),
      y1: running(rows.y1),
      x2: running(rows.x2),
      y2: running(rows.y2),
    };
  };
  const encoded7 = encodeFour16Dvals([aggGroup(0, diffs)], 7);
  assertEquals(four16Dec(encoded7.get(0) as string, 7), [
    relOf(diffs).x1,
    relOf(diffs).y1,
    relOf(diffs).x2,
    relOf(diffs).y2,
  ]);
  const rel: CoordRows = {
    x1: [11, 1, -5, 40],
    y1: [0, -23, 7, -8],
    x2: [0, 0, 100, -100],
    y2: [23, 0, 255, -255],
  };
  const encoded8 = encodeFour16Dvals([lineGroup(0, rel)], 8);
  assertEquals(four16Dec(encoded8.get(0) as string, 8), [
    rel.x1,
    rel.y1,
    rel.x2,
    rel.y2,
  ]);
});

Deno.test("four16 rejects unsupported portray ranges", () => {
  assertThrows(
    () =>
      encodeFour16Dvals(
        [lineGroup(0, { x1: [1], y1: [0], x2: [0], y2: [0] })],
        9,
      ),
    Error,
  );
});
