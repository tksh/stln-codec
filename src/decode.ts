/**
 * Decode facade: URL params → data object → SVG string.
 *
 * Async throughout — `tryDecompress` awaits the deflate-raw branch (see
 * `flags.ts`). Group ids are positional (0-based loop index), matching pfpg's
 * `decodeAsThreeData`, which ignores the param key order beyond that.
 */
import { absToRel, bigint64Dec } from "bigint64/bigint64";
import { getBasicDataFromUrlParams, resolveUintN } from "basic-data/basic-data";
import { bruteforce53Dec } from "bruteforce53/bruteforce53";
import { diffToRel } from "bruteforce53/diff";
import { hexExpandToTen } from "color/hex";
import { BASIC_DATA_KEYS, encodingMethodOf } from "stln-constants";
import { tryDecompress } from "flags";
import { four16Dec } from "four16/four16";
import { decodeGroupColors } from "group-colors/group-colors";
import { relToAbs, sizeDataDec } from "size-data/size-data";
import { generateSvg } from "svg/svg";
import { swap63Dec } from "swap63/swap63";
import type { DecodedGroup, DecodedParams, DvalQuad, PathMode } from "types";
import { decodeWidthsAndCounts } from "widths-counts/widths-counts";

function toQuad(rows: number[][], what: string): DvalQuad {
  if (rows.length !== 4) throw new Error(`${what}: expected four coordinates`);
  const [x1, y1, x2, y2] = rows;
  if (
    x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined
  ) {
    throw new Error(`${what}: unreachable index`);
  }
  return [x1, y1, x2, y2];
}

function rowsOf(quad: DvalQuad): DecodedGroup["relDvalsObj"] {
  return { x1: quad[0], y1: quad[1], x2: quad[2], y2: quad[3] };
}

/** Decode URL params (with or without leading `?`) to the data object. */
export async function decodeUrlParams(
  search: string | URLSearchParams,
): Promise<DecodedParams> {
  const params = typeof search === "string"
    ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
    : new URLSearchParams(search.toString());
  const basicData = await getBasicDataFromUrlParams(params);
  const uintN = resolveUintN(basicData.bits);

  const basicKeys = new Set<string>(BASIC_DATA_KEYS);
  const lineEntries: Array<[string, string]> = [];
  for (const [key, value] of params) {
    if (!basicKeys.has(key)) lineEntries.push([key, value]);
  }

  const linesData = new Map<number, DecodedGroup>();
  for (let gId = 0; gId < lineEntries.length; gId++) {
    const entry = lineEntries[gId];
    if (entry === undefined) {
      throw new Error("decodeUrlParams: unreachable index");
    }
    const [colorKey, rawValue] = entry;
    const groupColors = decodeGroupColors(hexExpandToTen(colorKey));
    const payload = await tryDecompress(rawValue);
    const flag = payload[0];
    if (flag === undefined) {
      throw new Error(`decodeUrlParams: empty payload for group ${gId}`);
    }
    const method = encodingMethodOf(flag);
    if (method === undefined) {
      throw new Error(
        `decodeUrlParams: unknown encoding flag ${JSON.stringify(flag)}`,
      );
    }
    const separator = payload.indexOf("-", 1);
    if (separator === -1) {
      throw new Error(`decodeUrlParams: no widths separator for group ${gId}`);
    }
    const widthsAndCounts = decodeWidthsAndCounts(payload.slice(1, separator));
    const encodedDvals = payload.slice(separator + 1);

    let rel: DvalQuad;
    let abs: DvalQuad;
    switch (method) {
      case "bruteforce53": {
        const diffs = toQuad(
          bruteforce53Dec(encodedDvals, uintN),
          `group ${gId}`,
        );
        rel = toQuad(diffs.map(diffToRel), `group ${gId}`);
        abs = relToAbs(rel, widthsAndCounts);
        break;
      }
      case "bigint64": {
        abs = bigint64Dec(encodedDvals, uintN);
        rel = absToRel(abs, widthsAndCounts);
        break;
      }
      case "swap63": {
        rel = swap63Dec(encodedDvals);
        abs = relToAbs(rel, widthsAndCounts);
        break;
      }
      case "four16": {
        rel = four16Dec(encodedDvals, uintN);
        abs = relToAbs(rel, widthsAndCounts);
        break;
      }
    }
    linesData.set(gId, {
      groupColors,
      encodingMethodFlag: flag,
      widthsAndCounts,
      encodedDvals,
      relDvalsObj: rowsOf(rel),
      absDvalsObj: rowsOf(abs),
    });
  }

  const background = linesData.get(0);
  if (background === undefined) {
    throw new Error("decodeUrlParams: missing background group");
  }
  return { basicData, linesData, sizeData: sizeDataDec(background) };
}

/** Decode URL params all the way to an SVG string. */
export async function decodeUrlToSvg(
  search: string | URLSearchParams,
  opts: { pathMode: PathMode },
): Promise<{ svg: string; data: DecodedParams }> {
  const data = await decodeUrlParams(search);
  return { svg: generateSvg(data, { pathMode: opts.pathMode }), data };
}

/**
 * Merge encoded basic data (`?k=v&…`) and lines data (`k=v&…`) into finished
 * URL params (pfpg's `mergeBasicDataAndLinesData`, minus the textareas).
 */
export function mergeUrlParams(
  basicParams: string,
  linesParams: string,
): string {
  if (basicParams === "" || linesParams === "") {
    throw new Error("mergeUrlParams: both basic and lines data are required");
  }
  return basicParams + linesParams;
}
