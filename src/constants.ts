/**
 * Shared constants: URL-param keys, compression/encoding flags, SVG spacing.
 *
 * This is the codec-owned subset of pfpg's `constants.js`; the settings maps
 * (`SETTINGS_DEFAULTS` et al.) stay in pfpg because they describe UI state.
 */

/** Basic-data URL-param keys, in canonical order (`bits` required). */
export const BASIC_DATA_KEYS = [
  "bits",
  "version",
  "title",
  "desc",
  "metadata",
] as const;
export type BasicDataKey = typeof BASIC_DATA_KEYS[number];

/** 1st flag: compression method applied to a param value. */
export const COMPRESSION_FLAGS = {
  uncompressed: "~",
  URLCompressor: "0",
  deflateRaw: "1",
} as const;
export type CompressionMethodName = keyof typeof COMPRESSION_FLAGS;

/** 2nd flag: d-value encoding method for a line group. */
export const ENCODING_METHOD_FLAGS = {
  bruteforce53: "0",
  bigint64: "1",
  swap63: "2",
  four16: "3",
} as const;

const REVERSE_COMPRESSION = Object.fromEntries(
  Object.entries(COMPRESSION_FLAGS).map(([name, flag]) => [flag, name]),
) as Record<string, CompressionMethodName>;

const REVERSE_ENCODING = Object.fromEntries(
  Object.entries(ENCODING_METHOD_FLAGS).map(([name, flag]) => [flag, name]),
) as Record<string, keyof typeof ENCODING_METHOD_FLAGS>;

/** Flag char → compression method name (`undefined` when unknown). */
export function compressionMethodOf(
  flag: string,
): CompressionMethodName | undefined {
  return REVERSE_COMPRESSION[flag];
}

/** Flag char → d-value encoding method name (`undefined` when unknown). */
export function encodingMethodOf(
  flag: string,
): keyof typeof ENCODING_METHOD_FLAGS | undefined {
  return REVERSE_ENCODING[flag];
}

/** Four-space indent used between SVG tags. */
export const TAB_SPACE = "    ";

/** viewBox origin (always 0, 0). */
export const VIEWBOX_START_X = 0;
export const VIEWBOX_START_Y = 0;
