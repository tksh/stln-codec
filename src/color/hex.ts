/**
 * Hex string expansion/shortening for group-color codes.
 *
 * Group colors travel as 10 hex digits (`RRGGBB` + opacity + stroke-opacity)
 * shortened to 6|5|3|1 digits in URL params. Unlike the pfpg originals, every
 * invalid input throws instead of returning `"Invalid hex code"`, `undefined`,
 * or an `Error` value.
 */

/** Remove a leading `#`, if present. */
export function tryDeleteHash(hexStr: string): string {
  return hexStr.startsWith("#") ? hexStr.slice(1) : hexStr;
}

/** Add a leading `#`, if missing. */
export function tryAddHash(hexString: string): string {
  return hexString.startsWith("#") ? hexString : "#" + hexString;
}

function doubled(hex: string): string {
  return hex.split("").map((char) => char.repeat(2)).join("");
}

/** Expand 3-digit hex to 6 digits. */
export function hexExpandToSix(hex: string): string {
  if (!hex) throw new Error("hexExpandToSix: empty input");
  if (hex.length === 6) return hex;
  if (hex.length === 3) return doubled(hex);
  throw new Error(`hexExpandToSix: invalid length ${hex.length}`);
}

/** Expand a shortened 6|5|3|1-digit group-color code back to 10 digits. */
export function hexExpandToTen(hex: string): string {
  if (hex.length === 10) return hex;
  if (hex.length === 6) return hex + "ffff";
  if (hex.length === 3 || hex.length === 5) {
    const expanded = doubled(hex);
    return expanded.length === 6 ? expanded + "ffff" : expanded;
  }
  if (hex.length === 1) return hex.repeat(6) + "ffff";
  throw new Error(`hexExpandToTen: invalid length ${hex.length}`);
}

/**
 * Shorten a 10-digit group-color code to 6|5|3|1 digits:
 * pairs to single digits when possible, dropping `ff` opacities, then a
 * single digit when the color itself is uniform.
 */
export function hexShortenFromTen(hex: string): string {
  if (hex.length !== 10) {
    throw new Error("hexShortenFromTen: expected 10 digits");
  }
  let compressible = true;
  let compact = "";
  for (let i = 0; i < hex.length; i += 2) {
    const a = hex[i];
    const b = hex[i + 1];
    if (a === undefined || b === undefined) {
      throw new Error("hexShortenFromTen: unreachable index");
    }
    if (a === b) {
      compact += a;
    } else {
      compressible = false;
      break;
    }
  }
  if (compressible) {
    const opacityA = compact[3];
    const opacityB = compact[4];
    if (
      opacityA !== undefined && opacityB !== undefined &&
      opacityA.toLowerCase() === "f" && opacityB.toLowerCase() === "f"
    ) {
      compact = compact.slice(0, -2);
      const r = compact[0];
      const g = compact[1];
      const b = compact[2];
      if (r !== undefined && r === g && g === b) compact = r;
    }
    return compact;
  }
  const tail = hex.slice(6);
  if (tail.toLowerCase() === "ffff") return hex.slice(0, -4);
  return hex;
}

/** Halve even-length hex when every pair matches, else return it unchanged. */
export function hexShortenAsHalf(hex: string): string {
  let result = "";
  for (let i = 0; i < hex.length - 1; i += 2) {
    const a = hex[i];
    const b = hex[i + 1];
    if (a === undefined || b === undefined) {
      throw new Error("hexShortenAsHalf: unreachable index");
    }
    if (a === b) {
      result += a;
    } else {
      return hex;
    }
  }
  return result;
}
