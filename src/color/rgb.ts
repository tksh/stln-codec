/**
 * Hex/normalized color conversions for group colors.
 *
 * All functions throw on invalid input; the pfpg originals returned
 * `"Invalid …"` sentinel strings instead.
 */
import type { Rgb } from "types";
import { hexExpandToSix, tryDeleteHash } from "color/hex";

/** 2-digit hex → 0–1 normalized number rounded to 2 decimals. */
export function normalizedFromHex(hex: string): number {
  const normalized = parseInt(hex, 16) / 255;
  if (!Number.isFinite(normalized)) {
    throw new Error(`normalizedFromHex: invalid hex ${JSON.stringify(hex)}`);
  }
  return Number(normalized.toFixed(2));
}

/** 2-digit hex → uint8 (0–255). */
export function hexToUint8(twoDigitsHex: string): number {
  if (!/^[0-9A-Fa-f]{2}$/.test(twoDigitsHex)) {
    throw new Error(`hexToUint8: invalid hex ${JSON.stringify(twoDigitsHex)}`);
  }
  return parseInt(twoDigitsHex, 16);
}

/** 3- or 6-digit hex (with or without `#`) → `[r, g, b]` uint8 tuple. */
export function hexToRgbArr(
  threeOrSixDigitsHex: string,
): [number, number, number] {
  const six = hexExpandToSix(tryDeleteHash(threeOrSixDigitsHex));
  if (!/^[0-9A-Fa-f]{6}$/.test(six)) {
    throw new Error(
      `hexToRgbArr: invalid hex ${JSON.stringify(threeOrSixDigitsHex)}`,
    );
  }
  return [
    hexToUint8(six.substring(0, 2)),
    hexToUint8(six.substring(2, 4)),
    hexToUint8(six.substring(4, 6)),
  ];
}

/** `[r, g, b]` → `"rgb(r g b)"` (space-separated, Straightlines style). */
export function rgbStringify(
  rgbArr: readonly [number, number, number],
): string {
  return `rgb(${[...rgbArr].join(" ")})`;
}

/** 0–1 normalized number → 2-digit uppercase hex. */
export function normalizedToHex(num: number): string {
  if (!Number.isFinite(num) || num < 0 || num > 1) {
    throw new Error(`normalizedToHex: out of range ${num}`);
  }
  return Math.round(num * 255).toString(16).padStart(2, "0").toUpperCase();
}

/** uint8 (0–255) → 2-digit uppercase hex. */
export function uint8ToHex(num: number): string {
  if (!Number.isInteger(num) || num < 0 || num > 255) {
    throw new Error(`uint8ToHex: out of range ${num}`);
  }
  return num.toString(16).padStart(2, "0").toUpperCase();
}

/** `{ r, g, b }` uint8 object → 6-digit uppercase hex. */
export function rgbObjToHex(rgb: Rgb): string {
  return uint8ToHex(rgb.r) + uint8ToHex(rgb.g) + uint8ToHex(rgb.b);
}
