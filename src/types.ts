/**
 * Data model for the Straightlines (`stln`) URL codec.
 *
 * Mirrors the Straightlines ruleset
 * (https://github.com/tksh/Straightlines): drawings are grouped straight
 * lines with unsigned-integer coordinates; line group `id="0"` defines the
 * canvas background; lines render in either `absoluteSeparated` (simple) or
 * `relativeMerged` (efficient) path mode.
 *
 * These shapes match the JSON consumed today by pfpg's `data-manipulator`
 * page (see pfpg `tests/fixtures/*.sample-uint5.json`). Phase 2 ports the
 * pure encode/decode functions operating on them.
 */

/** Compressed-or-plain scalar: `"~"` = uncompressed, `"0…"`/`"1…"` = flagged. */
export type FlaggedString = string;

/** Basic (non-lines) artwork data; `bits` is required for decoding. */
export interface BasicData {
  bits: FlaggedString;
  version?: FlaggedString;
  title?: FlaggedString;
  desc?: FlaggedString;
  metadata?: FlaggedString;
}

/** 8-bit RGB triplet, e.g. `{ r: 255, g: 255, b: 255 }`. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Four coordinate rows of one line set. */
export interface Dvals {
  x1: number[];
  y1: number[];
  x2: number[];
  y2: number[];
}

/**
 * One grouped line set as parsed from the lines-data JSON: per-group colors,
 * per-line ids and stroke widths, plus coordinates in both absolute and
 * relative forms.
 */
export interface LineGroup {
  g_id: number;
  g_stroke: Rgb;
  g_opacity: number;
  g_stroke_opacity: number;
  id: number[];
  stroke_width: number[];
  d: {
    absolute: Dvals;
    relative: Dvals;
  };
}

/** Line-group rendering mode (see Straightlines "Path Modes"). */
export type PathMode = "absoluteSeparated" | "relativeMerged";

/** Supported d-value encoding methods (2nd flag char `0`–`3`). */
export type EncodingMethodName =
  | "bruteforce53"
  | "bigint64"
  | "swap63"
  | "four16";

/**
 * One decoded line group: colors, encoding flag, width/count runs, the
 * encoded d-value payload, and both decoded coordinate forms.
 */
export interface DecodedGroup {
  groupColors: DecodedGroupColors;
  encodingMethodFlag: string;
  widthsAndCounts: DecodedWidthsAndCounts;
  encodedDvals: string;
  relDvalsObj: Dvals;
  absDvalsObj: Dvals;
}

/** Decoded per-group color attributes (full fidelity, as encoded). */
export interface DecodedGroupColors {
  gStrokeHex: string;
  gStrokeRgbArr: [number, number, number];
  gStrokeRgbStr: string;
  gOpacityUint8: number;
  gOpacityFloat: number;
  /** `"1.0"`/`"0.0"` for 1/0, else the plain decimal string. */
  gOpacity: string;
  gStrokeOpacityUint8: number;
  gStrokeOpacityFloat: number;
  /** `"1.0"`/`"0.0"` for 1/0, else the plain decimal string. */
  gStrokeOpacity: string;
}

/** Decoded stroke-width runs with derived 1-based line indices. */
export interface DecodedWidthsAndCounts {
  widths: number[];
  counts: number[];
  firstlineIndices: number[];
  lastlineIndices: number[];
}

/** Canvas size derived from the `id="0"` background group. */
export interface SizeData {
  viewbox: string;
  width: number;
  height: number;
}

/** Full decode result: basic data, per-group lines data, canvas size. */
export interface DecodedParams {
  basicData: BasicData;
  linesData: Map<number, DecodedGroup>;
  sizeData: SizeData;
}

/** Four coordinate rows, used for aggregated diff/frequency tables. */
export interface CoordRows {
  x1: number[];
  y1: number[];
  x2: number[];
  y2: number[];
}

/** Aggregated per-mode data feeding the d-value encoders. */
export interface AggModeData {
  diff_by_row: CoordRows;
  frequent_diff_values_sorted: CoordRows;
  frequent_diff_counts_sorted: CoordRows;
}

/**
 * Lines data aggregated for encoding (one entry per line group): stroke-width
 * runs plus absolute/relative diff tables.
 */
export interface AggregatedLinesData {
  g_id: number;
  stroke_width: {
    widths: number[];
    counts: number[];
  };
  d: {
    absolute: AggModeData;
    relative: AggModeData;
  };
}
