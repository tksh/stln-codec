/**
 * Basic-data codec: the non-lines artwork params (`bits`, `version`, `title`,
 * `desc`, `metadata`).
 *
 * Values already URI-safe pass through verbatim; anything else is
 * URLCompressor-encoded and `~`-prefixed (matching pfpg's `processProperty`).
 */
import { encode as urlCompressorEncode } from "@tksh/url-compressor";
import type { BasicData } from "types";
import { BASIC_DATA_KEYS, type BasicDataKey } from "stln-constants";
import { tryDecompress } from "flags";

/** Unreserved URI characters (RFC 3986 §2.3). */
const URI_SAFE = /^[0-9a-zA-Z_\-\.~]+$/;

/** Parse basic data from decoded JSON (`unknown` in, validated `BasicData` out). */
export function parseBasicData(json: unknown): BasicData {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("parseBasicData: expected a JSON object");
  }
  const record = json as Record<string, unknown>;
  const result: BasicData = { bits: "" };
  let bitsSeen = false;
  for (const key of BASIC_DATA_KEYS) {
    const value = record[key];
    if (value === undefined || value === "") continue;
    if (typeof value !== "string") {
      throw new Error(`parseBasicData: ${key} must be a string`);
    }
    if (key === "bits") {
      result.bits = value;
      bitsSeen = true;
    } else if (key === "version") {
      result.version = value;
    } else if (key === "title") {
      result.title = value;
    } else if (key === "desc") {
      result.desc = value;
    } else {
      result.metadata = value;
    }
  }
  if (!bitsSeen) throw new Error("parseBasicData: bits is required");
  return result;
}

/**
 * Encode basic data to its `?k=v&…` URL-param fragment.
 *
 * Value contract: a `~`-prefixed value claims to be already URI-safe and
 * passes through verbatim (the decoder strips exactly one `~`). A
 * `~`-prefixed value containing non-URI-safe characters is rejected — it
 * could never decode back — as is any attempt to encode it. Other unsafe
 * values take the `~`-prefixed compressor path.
 */
export function encodeBasicData(
  data: BasicData,
  opts: { include?: readonly BasicDataKey[] } = {},
): string {
  const include = opts.include ?? [...BASIC_DATA_KEYS];
  let params = "?";
  for (const key of include) {
    const value = data[key];
    if (value === undefined || value === "") continue;
    if (value.startsWith("~") && !URI_SAFE.test(value)) {
      throw new Error(
        `encodeBasicData: ${key} claims verbatim (~) form but is not URI-safe: ${
          JSON.stringify(value)
        }`,
      );
    }
    params += URI_SAFE.test(value)
      ? `${key}=${value}&`
      : `${key}=~${urlCompressorEncode(value)}&`;
  }
  return params;
}

/**
 * Decode basic-data values out of URL params (decompressing each).
 *
 * Strict: a present-but-empty value is invalid data and throws — callers must
 * not silently render artwork with a missing title, empty bits, and the like.
 * Absent optional keys are simply omitted (`bits` is still required).
 */
export async function getBasicDataFromUrlParams(
  params: URLSearchParams,
): Promise<BasicData> {
  const result: BasicData = { bits: "" };
  let bitsSeen = false;
  for (const key of BASIC_DATA_KEYS) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    if (raw === null) continue;
    if (raw === "") {
      throw new Error(`getBasicDataFromUrlParams: empty value for ${key}`);
    }
    const value = await tryDecompress(raw);
    if (key === "bits") {
      result.bits = value;
      bitsSeen = true;
    } else if (key === "version") {
      result.version = value;
    } else if (key === "title") {
      result.title = value;
    } else if (key === "desc") {
      result.desc = value;
    } else {
      result.metadata = value;
    }
  }
  if (!bitsSeen) throw new Error("getBasicDataFromUrlParams: bits is required");
  return result;
}

/**
 * Resolve the UIntN grid size from decoded `bits` (e.g. `"5"` → `5`).
 *
 * Takes the value *after* `tryDecompress`, mirroring pfpg (which decompresses
 * exactly once in basic-data decoding, then coerces). Callers holding flagged
 * input decompress first.
 */
export function resolveUintN(bits: string): number {
  if (bits === "") throw new Error("resolveUintN: empty bits");
  const uintN = Number(bits);
  if (!Number.isInteger(uintN) || uintN < 0) {
    throw new Error(`resolveUintN: invalid bits ${JSON.stringify(bits)}`);
  }
  return uintN;
}
