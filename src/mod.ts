/**
 * stln-codec: Straightlines URL codec + SVG generator.
 *
 * Phase 1 scaffold — data model only. Phase 2 adds the pure codec:
 * `encodeBasicData`, per-method lines-data encoders, `bestMixEncode`,
 * `mergeUrlParams`, async `decodeUrlParams`, and `generateSvg`.
 */
export * from "types";
export * from "stln-constants";
export * from "compression";
export * from "flags";
export * from "base-n/mod";
export * from "basic-data/mod";
export * from "group-colors/mod";
export * from "widths-counts/mod";
export * from "bruteforce53/mod";
export * from "bigint64/mod";
export * from "swap63/mod";
export * from "four16/mod";
export * from "size-data/mod";
export * from "svg/mod";
export * from "encode/mod";
export * from "decode";
