/**
 * Group-color codec: per-line-group `stroke` + `opacity` + `stroke-opacity`
 * as a shortened hex URL-param key.
 *
 * Encode takes line groups (not a textarea id); decode takes the 10-digit
 * expanded hex (callers expand via `hexExpandToTen` first).
 */
import { hexShortenFromTen } from "color/hex";
import { addDecimalToZeroAndOne } from "color/opacity";
import {
  hexToRgbArr,
  hexToUint8,
  normalizedFromHex,
  rgbObjToHex,
  rgbStringify,
  uint8ToHex,
} from "color/rgb";
import type { DecodedGroupColors, LineGroup } from "types";

/** Encode each group's colors to its shortened URL-param key, by group id. */
export function encodeGroupColors(
  groups: Iterable<LineGroup>,
): Map<number, string> {
  const encoded = new Map<number, string>();
  for (const group of groups) {
    const colors = rgbObjToHex(group.g_stroke) +
      uint8ToHex(group.g_opacity) +
      uint8ToHex(group.g_stroke_opacity);
    encoded.set(group.g_id, hexShortenFromTen(colors));
  }
  return encoded;
}

/** Decode 10-digit hex (`RRGGBB` + opacity + stroke-opacity) to group colors. */
export function decodeGroupColors(tenDigitsHex: string): DecodedGroupColors {
  if (tenDigitsHex.length !== 10) {
    throw new Error(
      `decodeGroupColors: expected 10 hex digits, got ${tenDigitsHex.length}`,
    );
  }
  const gStrokeHex = "#" + tenDigitsHex.slice(0, 6);
  const gStrokeRgbArr = hexToRgbArr(gStrokeHex);
  const gStrokeRgbStr = rgbStringify(gStrokeRgbArr);
  const gOpacityUint8 = hexToUint8(tenDigitsHex.slice(6, 8));
  const gOpacityFloat = normalizedFromHex(tenDigitsHex.slice(6, 8));
  const gOpacity = addDecimalToZeroAndOne(gOpacityFloat);
  const gStrokeOpacityUint8 = hexToUint8(tenDigitsHex.slice(8));
  const gStrokeOpacityFloat = normalizedFromHex(tenDigitsHex.slice(8));
  const gStrokeOpacity = addDecimalToZeroAndOne(gStrokeOpacityFloat);
  return {
    gStrokeHex,
    gStrokeRgbArr,
    gStrokeRgbStr,
    gOpacityUint8,
    gOpacityFloat,
    gOpacity,
    gStrokeOpacityUint8,
    gStrokeOpacityFloat,
    gStrokeOpacity,
  };
}
