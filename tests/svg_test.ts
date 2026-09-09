import { assertStrictEquals } from "@std/assert";
import { generateSvg } from "../src/svg/mod.ts";
import type { DecodedGroup, DecodedParams } from "../src/types.ts";

function group(
  partial: Partial<DecodedGroup> & Pick<DecodedGroup, "groupColors">,
): DecodedGroup {
  return {
    encodingMethodFlag: "1",
    widthsAndCounts: {
      widths: [1],
      counts: [1],
      firstlineIndices: [1],
      lastlineIndices: [1],
    },
    encodedDvals: "",
    relDvalsObj: { x1: [0], y1: [0], x2: [0], y2: [0] },
    absDvalsObj: { x1: [0], y1: [0], x2: [0], y2: [0] },
    ...partial,
  };
}

const WHITE = {
  gStrokeHex: "#FFFFFF",
  gStrokeRgbArr: [255, 255, 255] as [number, number, number],
  gStrokeRgbStr: "rgb(255 255 255)",
  gOpacityUint8: 255,
  gOpacityFloat: 1,
  gOpacity: "1.0",
  gStrokeOpacityUint8: 255,
  gStrokeOpacityFloat: 1,
  gStrokeOpacity: "1.0",
};

const BLACK_DIM = {
  gStrokeHex: "#000000",
  gStrokeRgbArr: [0, 0, 0] as [number, number, number],
  gStrokeRgbStr: "rgb(0 0 0)",
  gOpacityUint8: 204,
  gOpacityFloat: 0.8,
  gOpacity: "0.8",
  gStrokeOpacityUint8: 255,
  gStrokeOpacityFloat: 1,
  gStrokeOpacity: "1.0",
};

function twoGroups(): DecodedParams {
  return {
    basicData: { bits: "5", title: "T", desc: "D" },
    linesData: new Map([
      [
        0,
        group({
          groupColors: WHITE,
          widthsAndCounts: {
            widths: [31],
            counts: [2],
            firstlineIndices: [1],
            lastlineIndices: [2],
          },
          relDvalsObj: { x1: [15, 1], y1: [0, -31], x2: [0, 0], y2: [31, 0] },
          absDvalsObj: { x1: [15, 16], y1: [0, 0], x2: [15, 16], y2: [31, 31] },
        }),
      ],
      [
        1,
        group({
          groupColors: BLACK_DIM,
          widthsAndCounts: {
            widths: [3, 1],
            counts: [1, 2],
            firstlineIndices: [1, 2],
            lastlineIndices: [1, 3],
          },
          relDvalsObj: {
            x1: [1, 4, 1],
            y1: [2, 4, 1],
            x2: [2, 2, 2],
            y2: [2, 2, 2],
          },
          absDvalsObj: {
            x1: [1, 5, 6],
            y1: [2, 6, 7],
            x2: [3, 7, 8],
            y2: [4, 8, 9],
          },
        }),
      ],
    ]),
    sizeData: { viewbox: "0 0 31 31", width: 31, height: 31 },
  };
}

const EXPECTED_REL =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 31" shape-rendering="crispEdges">
    <title>T</title>
    <desc>D</desc>
    <defs>
        <clipPath id="shape-to-trim">
            <rect width="100%" height="100%" />
        </clipPath>
    </defs>
    <g clip-path="url(#shape-to-trim)">
        <g id="0" stroke="rgb(255 255 255)" opacity="1.0" stroke-opacity="1.0">
            <path stroke-width="31" d="m 15 0 0 31m 1 -31 0 0" />
        </g>
        <g id="1" stroke="rgb(0 0 0)" opacity="0.8" stroke-opacity="1.0">
            <path stroke-width="3" d="m 1 2 2 2" />
            <path stroke-width="1" d="m 4 4 2 2m 1 1 2 2" />
        </g>
    </g>
</svg>`;

const EXPECTED_ABS =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 31" shape-rendering="crispEdges">
    <title>T</title>
    <desc>D</desc>
    <defs>
        <clipPath id="shape-to-trim">
            <rect width="100%" height="100%" />
        </clipPath>
    </defs>
    <g clip-path="url(#shape-to-trim)">
        <g id="0" stroke="rgb(255 255 255)" opacity="1.0" stroke-opacity="1.0">
            <g stroke-width="31">
                <path d="M 15 0 L 15 31" />
                <path d="M 16 0 L 16 31" />
            </g>
        </g>
        <g id="1" stroke="rgb(0 0 0)" opacity="0.8" stroke-opacity="1.0">
            <g stroke-width="3">
                <path d="M 1 2 L 3 4" />
            </g>
            <g stroke-width="1">
                <path d="M 5 6 L 7 8" />
                <path d="M 6 7 L 8 9" />
            </g>
        </g>
    </g>
</svg>`;

Deno.test("generateSvg renders relative-merged SVG", () => {
  assertStrictEquals(
    generateSvg(twoGroups(), { pathMode: "relativeMerged" }),
    EXPECTED_REL,
  );
});

Deno.test("generateSvg renders absolute-separated SVG", () => {
  assertStrictEquals(
    generateSvg(twoGroups(), { pathMode: "absoluteSeparated" }),
    EXPECTED_ABS,
  );
});

Deno.test("generateSvg omits absent optional tags and indents metadata", () => {
  const minimal: DecodedParams = {
    basicData: { bits: "5", metadata: "a\nb" },
    linesData: new Map([[0, group({ groupColors: WHITE })]]),
    sizeData: { viewbox: "0 0 1 1", width: 1, height: 1 },
  };
  const svg = generateSvg(minimal, { pathMode: "relativeMerged" });
  assertStrictEquals(
    svg.includes("<title>"),
    false,
    "absent title must be omitted",
  );
  assertStrictEquals(
    svg.includes("    <metadata>\n        a\n        b\n    </metadata>"),
    true,
    "metadata must be indented",
  );
});
