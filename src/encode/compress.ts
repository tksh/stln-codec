/**
 * Per-group compression selection: `[2nd-flag][widths]-[dvals]` is tried
 * uncompressed, URLCompressor-, and deflate-raw-compressed; the shortest wins
 * (ties keep the earlier method, i.e. uncompressed first). The winner gets
 * the 1st flag prepended and the group-color key attached:
 * `[colors]=[1st][payload]`.
 */
import { encode as urlCompressorEncode } from "@tksh/url-compressor";
import { compressToEncodedURIComponent } from "compression";
import {
  COMPRESSION_FLAGS,
  type CompressionMethodName,
  ENCODING_METHOD_FLAGS,
} from "stln-constants";
import type { EncodingMethodName } from "types";

export interface CompressArgs {
  /** Raw d-value payloads by group id (no flags, no widths). */
  dvals: Map<number, string>;
  /** Encoded `[width][base53(count)]…` runs by group id. */
  widthsAndCounts: Map<number, string>;
  /** Encoded group-color keys by group id. */
  groupColors: Map<number, string>;
  method: EncodingMethodName;
}

export interface CompressDetail {
  gId: number;
  before: number;
  after: number;
  method: CompressionMethodName;
}

/** Compress each group and form `key=value` pairs (replaces `resultInfo`). */
export async function tryCompressDvals(
  args: CompressArgs,
): Promise<
  { compressedByGroups: Map<number, string>; details: CompressDetail[] }
> {
  const flag2 = ENCODING_METHOD_FLAGS[args.method];
  const compressedByGroups = new Map<number, string>();
  const details: CompressDetail[] = [];
  for (const [gId, dval] of args.dvals) {
    const widths = args.widthsAndCounts.get(gId);
    const colors = args.groupColors.get(gId);
    if (widths === undefined || colors === undefined) {
      throw new Error(
        `tryCompressDvals: missing widths/colors for group ${gId}`,
      );
    }
    const uncompressed = `${flag2}${widths}-${dval}`;
    const candidates: Array<{ method: CompressionMethodName; data: string }> = [
      { method: "uncompressed", data: uncompressed },
    ];
    const urlCompressed = urlCompressorEncode(uncompressed);
    if (urlCompressed !== null) {
      candidates.push({ method: "URLCompressor", data: urlCompressed });
    }
    candidates.push({
      method: "deflateRaw",
      data: await compressToEncodedURIComponent(uncompressed, "deflate-raw"),
    });
    const first = candidates[0];
    if (first === undefined) throw new Error("tryCompressDvals: unreachable");
    let best = first;
    for (const candidate of candidates) {
      if (candidate.data.length < best.data.length) best = candidate;
    }
    compressedByGroups.set(
      gId,
      `${colors}=${COMPRESSION_FLAGS[best.method]}${best.data}`,
    );
    details.push({
      gId,
      before: uncompressed.length + 1,
      after: best.data.length + 1,
      method: best.method,
    });
  }
  return { compressedByGroups, details };
}

/** Join per-group `key=value` strings with `&`. */
export function joinWithAmpersand(byGroup: Map<number, string>): string {
  return [...byGroup.values()].join("&");
}
