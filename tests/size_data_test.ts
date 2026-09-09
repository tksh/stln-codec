import { assertEquals, assertThrows } from "@std/assert";
import { absToRel } from "../src/bigint64/mod.ts";
import { decodeWidthsAndCounts } from "../src/widths-counts/mod.ts";
import {
  calculateCanvasSize,
  relToAbs,
  sizeDataDec,
} from "../src/size-data/mod.ts";
import type { DecodedGroup, DvalQuad } from "../src/types.ts";

Deno.test("calculateCanvasSize matches the documented canvases", () => {
  // 127x127 square from two top-to-bottom strokes.
  assertEquals(
    calculateCanvasSize({
      x1: [63, 64],
      y1: [0, 0],
      x2: [63, 64],
      y2: [127, 127],
    }),
    { width: 127, height: 127 },
  );
  // 128x128 square from one right-to-left stroke.
  assertEquals(
    calculateCanvasSize({ x1: [128], y1: [64], x2: [0], y2: [64] }),
    { width: 128, height: 128 },
  );
  // 79x128 portrait from one left-to-right stroke.
  assertEquals(
    calculateCanvasSize({ x1: [0], y1: [64], x2: [79], y2: [64] }),
    { width: 79, height: 128 },
  );
  assertThrows(
    () =>
      calculateCanvasSize({
        x1: [1, 2, 3],
        y1: [0, 0, 0],
        x2: [1, 2, 3],
        y2: [4, 5, 6],
      }),
    Error,
  );
});

function backgroundGroup(abs: DvalQuad): DecodedGroup {
  return {
    groupColors: {
      gStrokeHex: "#AAAAAA",
      gStrokeRgbArr: [170, 170, 170],
      gStrokeRgbStr: "rgb(170 170 170)",
      gOpacityUint8: 255,
      gOpacityFloat: 1,
      gOpacity: "1.0",
      gStrokeOpacityUint8: 255,
      gStrokeOpacityFloat: 1,
      gStrokeOpacity: "1.0",
    },
    encodingMethodFlag: "1",
    widthsAndCounts: decodeWidthsAndCounts("31b"),
    encodedDvals: "",
    relDvalsObj: { x1: [], y1: [], x2: [], y2: [] },
    absDvalsObj: { x1: abs[0], y1: abs[1], x2: abs[2], y2: abs[3] },
  };
}

Deno.test("sizeDataDec derives the viewBox from the background group", () => {
  const size = sizeDataDec(
    backgroundGroup([[63, 64], [0, 0], [63, 64], [127, 127]]),
  );
  assertEquals(size, { viewbox: "0 0 127 127", width: 127, height: 127 });
});

Deno.test("relToAbs inverts absToRel across width runs", () => {
  const abs: DvalQuad = [
    [1, 4, 22, 21, 6, 16],
    [19, 18, 20, 19, 12, 15],
    [3, 6, 21, 19, 7, 13],
    [23, 23, 23, 23, 15, 17],
  ];
  const widths = decodeWidthsAndCounts("5d3b");
  const rel = absToRel(abs, widths);
  assertEquals(relToAbs(rel, widths), abs);
});

Deno.test("relToAbs keeps first lines absolute", () => {
  const rel: DvalQuad = [[11, 1], [0, -23], [0, 0], [23, 23]];
  const widths = decodeWidthsAndCounts("23b");
  assertEquals(relToAbs(rel, widths), [[11, 12], [0, 0], [11, 12], [23, 23]]);
});
