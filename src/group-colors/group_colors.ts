/**
 * Group-color codec: per-line-group `stroke` + `opacity` + `stroke-opacity`
 * as a shortened hex URL-param key.
 *
 * Encode takes line groups (not a textarea id); decode takes the 10-digit
 * expanded hex (callers expand via `expandGroupColor` first). The underlying
 * hex/RGB/opacity math lives in `@tksh/group-colors-param-codec`; only the
 * `stln-codec`-specific `LineGroup`/`DecodedGroupColors` shapes stay here.
 */
import {
  formatOpacity,
  hexToOpacity,
  hexToRgb,
  hexToUint8,
  rgbToHex,
  rgbToString,
  shortenGroupColor,
  uint8ToHex,
} from "@tksh/group-colors-param-codec";
import type { DecodedGroupColors, LineGroup } from "types";

/** Encode each group's colors to its shortened URL-param key, by group id. */
export function encodeGroupColors(
  groups: Iterable<LineGroup>,
): Map<number, string> {
  const encoded = new Map<number, string>();
  for (const group of groups) {
    const colors = rgbToHex(group.g_stroke) +
      uint8ToHex(group.g_opacity) +
      uint8ToHex(group.g_stroke_opacity);
    encoded.set(group.g_id, shortenGroupColor(colors));
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
  const gStrokeHex = "#" + tenDigitsHex.slice(0, 6).toUpperCase();
  const gStrokeRgb = hexToRgb(gStrokeHex);
  const gOpacityHex = tenDigitsHex.slice(6, 8);
  const gStrokeOpacityHex = tenDigitsHex.slice(8);
  const gOpacityFloat = hexToOpacity(gOpacityHex);
  const gStrokeOpacityFloat = hexToOpacity(gStrokeOpacityHex);
  return {
    gStrokeHex,
    gStrokeRgbArr: [gStrokeRgb.r, gStrokeRgb.g, gStrokeRgb.b],
    gStrokeRgbStr: rgbToString(gStrokeRgb),
    gOpacityUint8: hexToUint8(gOpacityHex),
    gOpacityFloat,
    gOpacity: formatOpacity(gOpacityFloat),
    gStrokeOpacityUint8: hexToUint8(gStrokeOpacityHex),
    gStrokeOpacityFloat,
    gStrokeOpacity: formatOpacity(gStrokeOpacityFloat),
  };
}
