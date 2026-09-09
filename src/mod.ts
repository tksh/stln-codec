/**
 * stln-codec: Straightlines URL codec + SVG generator.
 *
 * Phase 1 scaffold — data model only. Phase 2 adds the pure codec:
 * `encodeBasicData`, per-method lines-data encoders, `bestMixEncode`,
 * `mergeUrlParams`, async `decodeUrlParams`, and `generateSvg`.
 */
export * from "./types.ts";
export * from "./base-n/mod.ts";
export * from "./color/mod.ts";
export * from "./group-colors/mod.ts";
export * from "./widths-counts/mod.ts";
