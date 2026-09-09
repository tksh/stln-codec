/**
 * stln-codec: Straightlines URL codec + SVG generator.
 *
 * Phase 1 scaffold — data model only. Phase 2 adds the pure codec:
 * `encodeBasicData`, per-method lines-data encoders, `bestMixEncode`,
 * `mergeUrlParams`, async `decodeUrlParams`, and `generateSvg`.
 */
export * from "./types.ts";
export * from "./constants.ts";
export * from "./compression.ts";
export * from "./flags.ts";
export * from "./base-n/mod.ts";
export * from "./color/mod.ts";
export * from "./basic-data/mod.ts";
export * from "./group-colors/mod.ts";
export * from "./widths-counts/mod.ts";
export * from "./bruteforce53/mod.ts";
export * from "./bigint64/mod.ts";
export * from "./swap63/mod.ts";
export * from "./four16/mod.ts";
export * from "./size-data/mod.ts";
export * from "./svg/mod.ts";
export * from "./encode/mod.ts";
export * from "./decode.ts";
