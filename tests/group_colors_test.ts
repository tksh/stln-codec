import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { hexExpandToTen } from "../src/color/mod.ts";
import {
  decodeGroupColors,
  encodeGroupColors,
} from "../src/group-colors/mod.ts";
import type { LineGroup } from "../src/types.ts";

function lineGroup(
  g_id: number,
  r: number,
  g: number,
  b: number,
  opacity: number,
  strokeOpacity: number,
): LineGroup {
  return {
    g_id,
    g_stroke: { r, g, b },
    g_opacity: opacity,
    g_stroke_opacity: strokeOpacity,
    id: [g_id],
    stroke_width: [1],
    d: {
      absolute: { x1: [0], y1: [0], x2: [1], y2: [1] },
      relative: { x1: [0], y1: [0], x2: [1], y2: [1] },
    },
  };
}

Deno.test("encodeGroupColors shortens per-group colors", () => {
  const encoded = encodeGroupColors([
    lineGroup(0, 255, 255, 255, 255, 255),
    lineGroup(1, 0, 0, 0, 255, 255),
    lineGroup(2, 170, 187, 204, 255, 153),
  ]);
  assertStrictEquals(encoded.get(0), "F");
  assertStrictEquals(encoded.get(1), "0");
  assertStrictEquals(encoded.get(2), "ABCF9");
});

Deno.test("encodeGroupColors rejects out-of-range channels", () => {
  assertThrows(
    () => encodeGroupColors([lineGroup(0, 256, 0, 0, 255, 255)]),
    Error,
  );
});

Deno.test("decodeGroupColors expands 10-digit hex to color attributes", () => {
  assertEquals(decodeGroupColors("FFFFFFFFFF"), {
    gStrokeHex: "#FFFFFF",
    gStrokeRgbArr: [255, 255, 255],
    gStrokeRgbStr: "rgb(255 255 255)",
    gOpacityUint8: 255,
    gOpacityFloat: 1,
    gOpacity: "1.0",
    gStrokeOpacityUint8: 255,
    gStrokeOpacityFloat: 1,
    gStrokeOpacity: "1.0",
  });
  assertEquals(decodeGroupColors("AABBCCFF99"), {
    gStrokeHex: "#AABBCC",
    gStrokeRgbArr: [170, 187, 204],
    gStrokeRgbStr: "rgb(170 187 204)",
    gOpacityUint8: 255,
    gOpacityFloat: 1,
    gOpacity: "1.0",
    gStrokeOpacityUint8: 153,
    gStrokeOpacityFloat: 0.6,
    gStrokeOpacity: "0.6",
  });
  assertThrows(() => decodeGroupColors("FFF"), Error);
});

Deno.test("group colors round-trip through shorten and expand", () => {
  const groups = [
    lineGroup(0, 255, 255, 255, 255, 255),
    lineGroup(1, 17, 34, 51, 255, 136),
    lineGroup(2, 0, 0, 0, 0, 0),
  ];
  const encoded = encodeGroupColors(groups);
  for (const group of groups) {
    const short = encoded.get(group.g_id);
    assertStrictEquals(typeof short, "string");
    const decoded = decodeGroupColors(hexExpandToTen(short as string));
    assertStrictEquals(
      decoded.gStrokeRgbStr,
      `rgb(${group.g_stroke.r} ${group.g_stroke.g} ${group.g_stroke.b})`,
    );
    assertStrictEquals(decoded.gOpacityUint8, group.g_opacity);
    assertStrictEquals(decoded.gStrokeOpacityUint8, group.g_stroke_opacity);
  }
});
