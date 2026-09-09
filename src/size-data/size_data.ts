/**
 * Canvas size decoding and relative/absolute coordinate conversion.
 *
 * Group `id="0"` holds one or two background strokes; the canvas size derives
 * from their absolute coordinates. `relToAbs` inverts `absToRel` (bigint64).
 */
import type {
  DecodedGroup,
  DecodedWidthsAndCounts,
  DvalQuad,
  SizeData,
} from "../types.ts";
import { VIEWBOX_START_X, VIEWBOX_START_Y } from "../constants.ts";

interface Size {
  width: number;
  height: number;
}

/** Derive canvas width/height from background-group absolute coordinates. */
export function calculateCanvasSize(d: {
  x1: readonly number[];
  y1: readonly number[];
  x2: readonly number[];
  y2: readonly number[];
}): Size {
  const [x1a, x1b] = [d.x1[0], d.x1[1]];
  const [y1a, y1b] = [d.y1[0], d.y1[1]];
  const [x2a] = [d.x2[0]];
  const [y2a] = [d.y2[0]];
  if (
    d.x1.length === 2 && x1a !== undefined && x1b !== undefined &&
    y1a !== undefined && y1b !== undefined && x2a !== undefined &&
    y2a !== undefined
  ) {
    if (x1a === x2a) return { width: x1a + x1b, height: y1a + y2a }; // vertical strokes
    if (y1a === y2a) return { width: y1a + y1b, height: x1a + x2a }; // horizontal strokes
  }
  if (
    d.x1.length === 1 && x1a !== undefined && y1a !== undefined &&
    x2a !== undefined && y2a !== undefined
  ) {
    if (x1a === x2a) return { width: y1a + y2a, height: x1a + x2a }; // vertical stroke
    if (y1a === y2a) return { width: x1a + x2a, height: y1a + y2a }; // horizontal stroke
  }
  throw new Error("calculateCanvasSize: invalid background coordinates");
}

/** Decode canvas size (plus `viewBox`) from the background group. */
export function sizeDataDec(groupZero: DecodedGroup): SizeData {
  const { width, height } = calculateCanvasSize(groupZero.absDvalsObj);
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error("sizeDataDec: non-integer canvas size");
  }
  return {
    viewbox: `${VIEWBOX_START_X} ${VIEWBOX_START_Y} ${width} ${height}`,
    width,
    height,
  };
}

/** Relative → absolute coordinates, continuing across non-first lines. */
export function relToAbs(
  relativeDvals: DvalQuad,
  widthsAndCounts: DecodedWidthsAndCounts,
): DvalQuad {
  const [x1Rel, y1Rel, x2Rel, y2Rel] = relativeDvals;
  const firstline = new Set(widthsAndCounts.firstlineIndices.map((n) => n - 1));
  const lines: Array<[number, number, number, number]> = [];
  const count = x1Rel?.length ?? 0;
  for (let i = 0; i < count; i++) {
    const rx1 = x1Rel?.[i];
    const ry1 = y1Rel?.[i];
    const rx2 = x2Rel?.[i];
    const ry2 = y2Rel?.[i];
    if (
      rx1 === undefined || ry1 === undefined || rx2 === undefined ||
      ry2 === undefined
    ) {
      throw new Error("relToAbs: ragged coordinate arrays");
    }
    if (firstline.has(i)) {
      lines.push([rx1, ry1, rx1 + rx2, ry1 + ry2]);
    } else {
      const prev = lines[i - 1];
      if (prev === undefined) {
        throw new Error("relToAbs: missing previous line");
      }
      const x1 = rx1 + prev[2];
      const y1 = ry1 + prev[3];
      lines.push([x1, y1, rx2 + x1, ry2 + y1]);
    }
  }
  const quad: DvalQuad = [[], [], [], []];
  for (const [x1, y1, x2, y2] of lines) {
    quad[0].push(x1);
    quad[1].push(y1);
    quad[2].push(x2);
    quad[3].push(y2);
  }
  return quad;
}
