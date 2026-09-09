/**
 * Stroke-width runs codec: `[width, base53(count)]…` strings plus derived
 * 1-based first/last line indices.
 *
 * Encode takes aggregated lines data (not a textarea id).
 */
import { runningReduce } from "@std/collections/running-reduce";
import { base53Dec, base53Enc } from "../base-n/base53.ts";
import type { AggregatedLinesData, DecodedWidthsAndCounts } from "../types.ts";

/** Encode each group's stroke-width runs, by group id. */
export function encodeWidthsAndCounts(
  groups: Iterable<AggregatedLinesData>,
): Map<number, string> {
  const encoded = new Map<number, string>();
  for (const group of groups) {
    const { widths, counts } = group.stroke_width;
    if (widths.length !== counts.length) {
      throw new Error(
        `encodeWidthsAndCounts: widths/counts length mismatch for g_id ${group.g_id}`,
      );
    }
    let str = "";
    for (let i = 0; i < widths.length; i++) {
      const width = widths[i];
      const count = counts[i];
      if (width === undefined || count === undefined) {
        throw new Error("encodeWidthsAndCounts: unreachable index");
      }
      str += `${width}${base53Enc(count)}`;
    }
    encoded.set(group.g_id, str);
  }
  return encoded;
}

/** Decode a `[width, base53(count)]…` string with line index runs. */
export function decodeWidthsAndCounts(
  encodedStr: string,
): DecodedWidthsAndCounts {
  const parts = encodedStr.match(/\d+|[_a-zA-Z]+/g);
  if (parts === null) throw new Error("decodeWidthsAndCounts: empty input");
  if (parts.length % 2 !== 0) {
    throw new Error(
      `decodeWidthsAndCounts: odd segment count in ${
        JSON.stringify(encodedStr)
      }`,
    );
  }
  const widths: number[] = [];
  const counts: number[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const width = parts[i];
    const count = parts[i + 1];
    if (width === undefined || count === undefined) {
      throw new Error("decodeWidthsAndCounts: unreachable index");
    }
    widths.push(Number(width));
    counts.push(base53Dec(count));
  }
  const add = (acc: number, cur: number): number => acc + cur;
  // runningReduce omits the seed, so unshift the 1-based start and drop the tail.
  const firstlineIndices = [1, ...runningReduce(counts, add, 1)];
  firstlineIndices.pop();
  const lastlineIndices = runningReduce(counts, add, 0);
  return { firstlineIndices, lastlineIndices, widths, counts };
}
