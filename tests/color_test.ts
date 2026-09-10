import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import {
  addDecimalToZeroAndOne,
  hexExpandToSix,
  hexExpandToTen,
  hexShortenAsHalf,
  hexShortenFromTen,
  hexToRgbArr,
  hexToUint8,
  normalizedFromHex,
  normalizedToHex,
  rgbObjToHex,
  rgbStringify,
  tryAddHash,
  tryDeleteHash,
  uint8ToHex,
} from "color/mod";

// Vectors transcribed from the inline examples in pfpg's
// src/js/color-formatter/*.js and src/js/common-utils/format-as-float.js.

Deno.test("hash helpers add or remove a leading hash", () => {
  assertStrictEquals(tryDeleteHash("#FFF"), "FFF");
  assertStrictEquals(tryDeleteHash("FFF"), "FFF");
  assertStrictEquals(tryAddHash("FFFFFF"), "#FFFFFF");
  assertStrictEquals(tryAddHash("#FFFFFF"), "#FFFFFF");
});

Deno.test("hexExpandToSix doubles 3-digit codes", () => {
  assertStrictEquals(hexExpandToSix("ffffff"), "ffffff");
  assertStrictEquals(hexExpandToSix("fff"), "ffffff");
  assertThrows(() => hexExpandToSix(""), Error);
  assertThrows(() => hexExpandToSix("ff"), Error);
});

Deno.test("hexExpandToTen restores shortened group-color codes", () => {
  assertStrictEquals(hexExpandToTen("a"), "aaaaaaffff");
  assertStrictEquals(hexExpandToTen("123"), "112233ffff");
  assertStrictEquals(hexExpandToTen("abcde"), "aabbccddee");
  assertStrictEquals(hexExpandToTen("ffffff"), "ffffffffff");
  assertStrictEquals(hexExpandToTen("ffffffeedd"), "ffffffeedd");
  assertThrows(() => hexExpandToTen("ff"), Error);
  assertThrows(() => hexExpandToTen(""), Error);
});

Deno.test("hexShortenFromTen compresses 10-digit codes", () => {
  const vectors: Array<[string, string]> = [
    ["AABBCCFF99", "ABCF9"],
    ["AABBCCFFff", "ABC"],
    ["112233ff88", "123f8"],
    ["112233eeee", "123ee"],
    ["123456ffff", "123456"],
    ["AABBCCabcd", "AABBCCabcd"],
    ["1122334455", "12345"],
    ["112233FFFF", "123"],
    ["111111ffFF", "1"],
    ["AAAAAAFFFF", "A"],
    ["aaaaaaffff", "a"],
    ["FFFFFFFFFF", "F"],
    ["000000ffff", "0"],
  ];
  for (const [input, expected] of vectors) {
    assertStrictEquals(hexShortenFromTen(input), expected, input);
  }
  assertThrows(() => hexShortenFromTen("abc"), Error);
});

Deno.test("hexShortenAsHalf halves uniform pairs", () => {
  assertStrictEquals(hexShortenAsHalf("ffffff"), "fff");
  assertStrictEquals(hexShortenAsHalf("fffffe"), "fffffe");
  assertStrictEquals(hexShortenAsHalf("aabbccffff"), "abcff");
  assertStrictEquals(hexShortenAsHalf("123456ffff"), "123456ffff");
});

Deno.test("normalized hex conversions round-trip", () => {
  assertStrictEquals(normalizedFromHex("FF"), 1);
  assertStrictEquals(normalizedFromHex("CC"), 0.8);
  assertStrictEquals(normalizedFromHex("03"), 0.01);
  assertStrictEquals(normalizedFromHex("00"), 0);
  assertStrictEquals(normalizedToHex(1), "FF");
  assertStrictEquals(normalizedToHex(0.8), "CC");
  assertStrictEquals(normalizedToHex(0.01), "03");
  assertStrictEquals(normalizedToHex(0), "00");
  assertStrictEquals(uint8ToHex(0), "00");
  assertStrictEquals(uint8ToHex(1), "01");
  assertStrictEquals(uint8ToHex(255), "FF");
  assertThrows(() => normalizedToHex(2), Error);
  assertThrows(() => uint8ToHex(256), Error);
  assertThrows(() => uint8ToHex(1.5), Error);
});

Deno.test("rgb helpers convert between objects, arrays, and strings", () => {
  assertStrictEquals(rgbObjToHex({ r: 0, g: 0, b: 0 }), "000000");
  assertStrictEquals(rgbObjToHex({ r: 170, g: 170, b: 170 }), "AAAAAA");
  assertStrictEquals(rgbObjToHex({ r: 255, g: 255, b: 255 }), "FFFFFF");
  assertThrows(() => rgbObjToHex({ r: 256, g: 0, b: 0 }), Error);
  assertEquals(hexToRgbArr("000000"), [0, 0, 0]);
  assertEquals(hexToRgbArr("FFFFFF"), [255, 255, 255]);
  assertEquals(hexToRgbArr("FF8000"), [255, 128, 0]);
  assertEquals(hexToRgbArr("#fff"), [255, 255, 255]);
  assertThrows(() => hexToRgbArr("zzzzzz"), Error);
  assertStrictEquals(hexToUint8("00"), 0);
  assertStrictEquals(hexToUint8("FF"), 255);
  assertThrows(() => hexToUint8("F"), Error);
  assertStrictEquals(rgbStringify([255, 255, 255]), "rgb(255 255 255)");
  assertStrictEquals(rgbStringify([0, 0, 0]), "rgb(0 0 0)");
});

Deno.test("addDecimalToZeroAndOne formats SVG opacity values", () => {
  assertStrictEquals(addDecimalToZeroAndOne(1), "1.0");
  assertStrictEquals(addDecimalToZeroAndOne(0), "0.0");
  assertStrictEquals(addDecimalToZeroAndOne(0.5), "0.5");
  assertStrictEquals(addDecimalToZeroAndOne(0.8), "0.8");
});
