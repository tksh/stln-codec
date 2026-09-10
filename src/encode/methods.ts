/**
 * Full per-method line-group encoders: d-value payloads → compression
 * selection → `[colors]=[flags]…` pairs with method/config provenance.
 *
 * These are the DOM-free cores of pfpg's `*Enc` button handlers (no
 * textareas, no timing display, no global `resultInfo`).
 */
import { encodeBigint64Dvals, getDigitsPerChunk } from "bigint64/bigint64";
import { encodeBruteforce53Diffs } from "bruteforce53/bruteforce53";
import { encodeFour16Dvals } from "four16/four16";
import { encodeSwap63Dvals } from "swap63/swap63";
import type { AggregatedLinesData, EncodingMethodName, LineGroup } from "types";
import { tryCompressDvals } from "encode/compress";

/** One encoded group: the `key=value` pair plus what produced it. */
export interface EncodedGroup {
  kvPair: string;
  method: EncodingMethodName;
  config: MethodConfig;
}

/** Per-method configuration provenance (never `undefined`-valued). */
export type MethodConfig =
  | { baseXNumber: number }
  | { digitsPerChunk: number }
  | { none: true };

export interface MethodEncodeArgs {
  lines: LineGroup[];
  agg: AggregatedLinesData[];
  uintN: number;
  widthsAndCounts: Map<number, string>;
  groupColors: Map<number, string>;
}

/** bruteforce53 over all 53 codebook sizes, keeping each group's shortest. */
export async function encodeGroupsBruteforce53(
  args: MethodEncodeArgs,
): Promise<Map<number, EncodedGroup>> {
  const best = new Map<number, EncodedGroup>();
  for (let maxCodebookSize = 0; maxCodebookSize <= 52; maxCodebookSize++) {
    const baseXNumber = 52 - maxCodebookSize;
    const payloads = encodeBruteforce53Diffs(args.agg, args.uintN, baseXNumber);
    const { compressedByGroups } = await tryCompressDvals({
      dvals: payloads,
      widthsAndCounts: args.widthsAndCounts,
      groupColors: args.groupColors,
      method: "bruteforce53",
    });
    for (const [gId, kvPair] of compressedByGroups) {
      const current = best.get(gId);
      if (current === undefined || kvPair.length < current.kvPair.length) {
        best.set(gId, {
          kvPair,
          method: "bruteforce53",
          config: { baseXNumber },
        });
      }
    }
  }
  return best;
}

/** bigint64 over absolute coordinates. */
export async function encodeGroupsBigint64(
  args: MethodEncodeArgs,
): Promise<Map<number, EncodedGroup>> {
  const digitsPerChunk = getDigitsPerChunk(args.uintN);
  const payloads = encodeBigint64Dvals(args.lines, args.uintN);
  const { compressedByGroups } = await tryCompressDvals({
    dvals: payloads,
    widthsAndCounts: args.widthsAndCounts,
    groupColors: args.groupColors,
    method: "bigint64",
  });
  return wrapGroups(compressedByGroups, "bigint64", { digitsPerChunk });
}

/** swap63 over relative coordinates (≤31 grids). */
export async function encodeGroupsSwap63(
  args: MethodEncodeArgs,
): Promise<Map<number, EncodedGroup>> {
  const payloads = encodeSwap63Dvals(args.lines);
  const { compressedByGroups } = await tryCompressDvals({
    dvals: payloads,
    widthsAndCounts: args.widthsAndCounts,
    groupColors: args.groupColors,
    method: "swap63",
  });
  return wrapGroups(compressedByGroups, "swap63", { none: true });
}

/** four16 over diffs (≤7) or relatives (8). */
export async function encodeGroupsFour16(
  args: MethodEncodeArgs,
): Promise<Map<number, EncodedGroup>> {
  const payloads = encodeFour16Dvals(
    args.uintN <= 7 ? args.agg : args.lines,
    args.uintN,
  );
  const { compressedByGroups } = await tryCompressDvals({
    dvals: payloads,
    widthsAndCounts: args.widthsAndCounts,
    groupColors: args.groupColors,
    method: "four16",
  });
  return wrapGroups(compressedByGroups, "four16", { none: true });
}

function wrapGroups(
  pairs: Map<number, string>,
  method: EncodingMethodName,
  config: MethodConfig,
): Map<number, EncodedGroup> {
  return new Map(
    [...pairs].map(([gId, kvPair]) => [gId, { kvPair, method, config }]),
  );
}
