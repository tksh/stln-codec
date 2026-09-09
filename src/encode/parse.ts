/**
 * JSON parsing for encoder inputs.
 *
 * pfpg reads these from textareas (`jsonToMapObj`); the library validates
 * decoded JSON values into typed arrays instead.
 */
import type {
  AggregatedLinesData,
  CoordRows,
  LineGroup,
  Rgb,
} from "../types.ts";

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number");
}

function parseRgb(value: unknown, what: string): Rgb {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${what}: expected object`);
  }
  const record = value as Record<string, unknown>;
  const { r, g, b } = record;
  if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") {
    throw new Error(`${what}: r/g/b must be numbers`);
  }
  return { r, g, b };
}

function parseCoordRows(value: unknown, what: string): CoordRows {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${what}: expected object`);
  }
  const record = value as Record<string, unknown>;
  const rows: CoordRows = { x1: [], y1: [], x2: [], y2: [] };
  for (const key of ["x1", "y1", "x2", "y2"] as const) {
    const arr = record[key];
    if (!isNumberArray(arr)) {
      throw new Error(`${what}.${key}: expected number[]`);
    }
    rows[key] = arr;
  }
  return rows;
}

/** Validate lines-data JSON (`[{g_id, g_stroke, …, d}]`) into typed groups. */
export function parseLinesData(json: unknown): LineGroup[] {
  if (!Array.isArray(json)) {
    throw new Error("parseLinesData: expected an array");
  }
  return json.map((item, index): LineGroup => {
    const what = `parseLinesData[${index}]`;
    if (typeof item !== "object" || item === null) {
      throw new Error(`${what}: expected object`);
    }
    const record = item as Record<string, unknown>;
    const { g_id, g_opacity, g_stroke_opacity, id, stroke_width, d } = record;
    if (typeof g_id !== "number") {
      throw new Error(`${what}.g_id: expected number`);
    }
    if (typeof g_opacity !== "number" || typeof g_stroke_opacity !== "number") {
      throw new Error(`${what}: opacities must be numbers`);
    }
    if (!isNumberArray(id) || !isNumberArray(stroke_width)) {
      throw new Error(`${what}: id/stroke_width must be number[]`);
    }
    if (typeof d !== "object" || d === null) {
      throw new Error(`${what}.d: expected object`);
    }
    const coords = d as Record<string, unknown>;
    return {
      g_id,
      g_stroke: parseRgb(record["g_stroke"], `${what}.g_stroke`),
      g_opacity,
      g_stroke_opacity,
      id,
      stroke_width,
      d: {
        absolute: parseCoordRows(coords["absolute"], `${what}.d.absolute`),
        relative: parseCoordRows(coords["relative"], `${what}.d.relative`),
      },
    };
  });
}

/** Validate aggregated lines-data JSON into typed groups. */
export function parseAggregatedLinesData(json: unknown): AggregatedLinesData[] {
  if (!Array.isArray(json)) {
    throw new Error("parseAggregatedLinesData: expected an array");
  }
  return json.map((item, index): AggregatedLinesData => {
    const what = `parseAggregatedLinesData[${index}]`;
    if (typeof item !== "object" || item === null) {
      throw new Error(`${what}: expected object`);
    }
    const record = item as Record<string, unknown>;
    const { g_id, stroke_width, d } = record;
    if (typeof g_id !== "number") {
      throw new Error(`${what}.g_id: expected number`);
    }
    if (typeof stroke_width !== "object" || stroke_width === null) {
      throw new Error(`${what}.stroke_width: expected object`);
    }
    const runs = stroke_width as Record<string, unknown>;
    if (!isNumberArray(runs["widths"]) || !isNumberArray(runs["counts"])) {
      throw new Error(`${what}.stroke_width: widths/counts must be number[]`);
    }
    if (typeof d !== "object" || d === null) {
      throw new Error(`${what}.d: expected object`);
    }
    const modes = d as Record<string, unknown>;
    const mode = (name: string) => {
      const value = modes[name];
      if (typeof value !== "object" || value === null) {
        throw new Error(`${what}.d.${name}: expected object`);
      }
      const tables = value as Record<string, unknown>;
      return {
        diff_by_row: parseCoordRows(
          tables["diff_by_row"],
          `${what}.d.${name}.diff_by_row`,
        ),
        frequent_diff_values_sorted: parseCoordRows(
          tables["frequent_diff_values_sorted"],
          `${what}.d.${name}.frequent_diff_values_sorted`,
        ),
        frequent_diff_counts_sorted: parseCoordRows(
          tables["frequent_diff_counts_sorted"],
          `${what}.d.${name}.frequent_diff_counts_sorted`,
        ),
      };
    };
    return {
      g_id,
      stroke_width: {
        widths: runs["widths"] as number[],
        counts: runs["counts"] as number[],
      },
      d: { absolute: mode("absolute"), relative: mode("relative") },
    };
  });
}
