import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  absToRel,
  bigint64Dec,
  encodeBigint64Dvals,
  findNearestMultipleOfFourX,
  getDigitsPerChunk,
  recoverOriginalZeroPadding,
} from "../src/bigint64/mod.ts";
import type { DvalQuad, LineGroup } from "../src/types.ts";

function group(g_id: number, abs: DvalQuad): LineGroup {
  const rel: DvalQuad = [[], [], [], []];
  return {
    g_id,
    g_stroke: { r: 0, g: 0, b: 0 },
    g_opacity: 255,
    g_stroke_opacity: 255,
    id: [g_id],
    stroke_width: [1],
    d: {
      absolute: { x1: abs[0], y1: abs[1], x2: abs[2], y2: abs[3] },
      relative: { x1: rel[0], y1: rel[1], x2: rel[2], y2: rel[3] },
    },
  };
}

Deno.test("digits per chunk follow the documented table", () => {
  assertStrictEquals(getDigitsPerChunk(5), 2);
  assertStrictEquals(getDigitsPerChunk(6), 2);
  assertStrictEquals(getDigitsPerChunk(7), 3);
  assertStrictEquals(getDigitsPerChunk(8), 3);
  assertStrictEquals(getDigitsPerChunk(10), 4);
  assertStrictEquals(getDigitsPerChunk(14), 5);
});

Deno.test("padding helpers match the documented examples", () => {
  assertStrictEquals(findNearestMultipleOfFourX(23, 3), 24);
  assertStrictEquals(findNearestMultipleOfFourX(17, 2), 24);
  assertStrictEquals(findNearestMultipleOfFourX(119, 3), 120);
  assertStrictEquals(findNearestMultipleOfFourX(120, 2), 120);
  assertStrictEquals(findNearestMultipleOfFourX(151, 2), 152);
  assertStrictEquals(recoverOriginalZeroPadding("10407", 2), "00010407");
  assertStrictEquals(recoverOriginalZeroPadding("010407", 2), "00010407");
});

Deno.test("bigint64 round-trips absolute coordinates", () => {
  const abs: DvalQuad = [[11, 12], [0, 0], [11, 12], [23, 23]];
  const groups = [group(0, abs)];
  const encoded = encodeBigint64Dvals(groups, 5);
  const payload = encoded.get(0) as string;
  assertEquals(bigint64Dec(payload, 5), abs);
});

Deno.test("absToRel restarts at each width run", () => {
  const abs: DvalQuad = [[11, 12], [0, 0], [11, 12], [23, 23]];
  const rel = absToRel(abs, {
    widths: [23],
    counts: [2],
    firstlineIndices: [1],
    lastlineIndices: [2],
  });
  // Matches the uint5 placeholder fixture's relative rows.
  assertEquals(rel, [[11, 1], [0, -23], [0, 0], [23, 23]]);
});

Deno.test("bigint64 rejects malformed payloads", () => {
  assertThrows(() => bigint64Dec("!!!", 5), Error);
});
