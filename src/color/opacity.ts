/**
 * Opacity formatting for SVG attributes: `0`/`1` render as `"0.0"`/`"1.0"`,
 * every other value as its plain decimal string.
 */
export function addDecimalToZeroAndOne(num: number): string {
  if (num === 0 || num === 1) return num.toFixed(1);
  return num.toString();
}
