/**
 * Best-mix encoding: run the selected methods, keep each group's shortest
 * pair, join with `&`.
 *
 * Checkbox defaults from pfpg's data-manipulator page are available as
 * `defaultMethodsForUintN` (swap63 ≤ 5, four16 ≤ 8).
 */
import type { EncodingMethodName } from "../types.ts";
import { joinWithAmpersand } from "./compress.ts";
import {
  type EncodedGroup,
  encodeGroupsBigint64,
  encodeGroupsBruteforce53,
  encodeGroupsFour16,
  encodeGroupsSwap63,
  type MethodEncodeArgs,
} from "./methods.ts";

/** pfpg's default method selection for a grid size. */
export function defaultMethodsForUintN(uintN: number): EncodingMethodName[] {
  const methods: EncodingMethodName[] = ["bruteforce53", "bigint64"];
  if (uintN <= 8) methods.push("four16");
  if (uintN <= 5) methods.push("swap63");
  return methods;
}

const ENCODERS: Record<
  EncodingMethodName,
  (args: MethodEncodeArgs) => Promise<Map<number, EncodedGroup>>
> = {
  bruteforce53: encodeGroupsBruteforce53,
  bigint64: encodeGroupsBigint64,
  swap63: encodeGroupsSwap63,
  four16: encodeGroupsFour16,
};

export interface BestMixResult {
  /** `key=value&…` lines-data params (merge with basic data via `mergeUrlParams`). */
  params: string;
  /** Winning pair per group, in group order. */
  byGroup: Map<number, EncodedGroup>;
}

/** Encode with each method and keep the shortest pair per group. */
export async function bestMixEncode(
  args: MethodEncodeArgs,
  methods: readonly EncodingMethodName[] = defaultMethodsForUintN(args.uintN),
): Promise<BestMixResult> {
  if (methods.length === 0) {
    throw new Error("bestMixEncode: no methods selected");
  }
  const perMethod = await Promise.all(
    methods.map((method) => ENCODERS[method](args)),
  );
  const byGroup = new Map<number, EncodedGroup>();
  const groupCount = perMethod[0]?.size ?? 0;
  for (let gId = 0; gId < groupCount; gId++) {
    let winner: EncodedGroup | undefined;
    for (const groups of perMethod) {
      const candidate = groups.get(gId);
      if (candidate === undefined) continue;
      if (
        winner === undefined || candidate.kvPair.length < winner.kvPair.length
      ) {
        winner = candidate;
      }
    }
    if (winner === undefined) {
      throw new Error(`bestMixEncode: no encoding for group ${gId}`);
    }
    byGroup.set(gId, winner);
  }
  const params = joinWithAmpersand(
    new Map([...byGroup].map(([gId, pick]) => [gId, pick.kvPair])),
  );
  return { params, byGroup };
}
