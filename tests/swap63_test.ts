import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  createCodebook,
  encodeSwap63Dvals,
  get63Characters,
  get63Numbers,
  swap63Dec,
} from "../src/swap63/mod.ts";
import type { DvalQuad, LineGroup } from "../src/types.ts";

Deno.test("swap63 codebook spans -31..31 over 63 characters", () => {
  assertStrictEquals(get63Numbers().length, 63);
  assertStrictEquals(get63Numbers()[0], -31);
  assertStrictEquals(get63Numbers()[62], 31);
  assertEquals(get63Characters().slice(0, 12), [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
  ]);
  assertStrictEquals(get63Characters()[62], "_");
  const toChar = createCodebook(get63Numbers(), get63Characters());
  assertStrictEquals(toChar.get(-31), "0");
  assertStrictEquals(toChar.get(0), "v");
  assertStrictEquals(toChar.get(31), "_");
  assertThrows(() => createCodebook([1], ["a", "b"]), Error);
});

function group(g_id: number, rel: DvalQuad): LineGroup {
  return {
    g_id,
    g_stroke: { r: 0, g: 0, b: 0 },
    g_opacity: 255,
    g_stroke_opacity: 255,
    id: [g_id],
    stroke_width: [1],
    d: {
      absolute: { x1: [], y1: [], x2: [], y2: [] },
      relative: { x1: rel[0], y1: rel[1], x2: rel[2], y2: rel[3] },
    },
  };
}

Deno.test("swap63 round-trips relative coordinates", () => {
  const rel: DvalQuad = [[11, 1, -31], [0, -23, 31], [0, 0, -1], [23, 0, 15]];
  const encoded = encodeSwap63Dvals([group(0, rel)]);
  const payload = encoded.get(0) as string;
  assertStrictEquals(payload.length, 12);
  assertEquals(swap63Dec(payload), rel);
});

Deno.test("swap63 rejects out-of-range values and characters", () => {
  assertThrows(
    () => encodeSwap63Dvals([group(0, [[32], [0], [0], [0]])]),
    Error,
  );
  assertThrows(
    () => encodeSwap63Dvals([group(0, [[-32], [0], [0], [0]])]),
    Error,
  );
  assertThrows(() => swap63Dec("!!!}"), Error);
});
