import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  ALPHABET52,
  base52Dec,
  base52Enc,
  base53Dec,
  base53Enc,
  base64UrlDec,
  base64UrlEnc,
  getBase53Characters,
  getBase64UrlCharacters,
  getFour16CharsSets,
} from "../src/base-n/mod.ts";

// Vectors transcribed from the inline examples in pfpg's
// src/js/encode-and-decode/enc-and-dec/base-n/*.js.

Deno.test("character tables match the documented alphabets", () => {
  assertStrictEquals(
    getBase53Characters(),
    "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  );
  assertStrictEquals(
    getBase64UrlCharacters(),
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  );
  assertStrictEquals(
    ALPHABET52,
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  );
  assertEquals(getFour16CharsSets(), {
    p1: "abcdefghijklmnop",
    n1: "ABCDEFGHIJKLMNOP",
    p2: "qrstuvwxyz012345",
    n2: "QRSTUVWXYZ6789-_",
  });
});

Deno.test("base52 round-trips the documented vectors", () => {
  const vectors: Array<[number, string]> = [
    [0, "a"],
    [1, "b"],
    [26, "A"],
    [27, "B"],
    [51, "Z"],
    [52, "ba"],
    [2703, "ZZ"],
    [2704, "baa"],
    [140607, "ZZZ"],
    [140608, "baaa"],
  ];
  for (const [num, str] of vectors) {
    assertStrictEquals(base52Enc(num), str);
    assertStrictEquals(base52Dec(str), num);
  }
  // Zero stays zero however it is padded.
  assertStrictEquals(base52Dec("aa"), 0);
  assertStrictEquals(base52Dec("aaa"), 0);
});

Deno.test("base52 rejects invalid input", () => {
  assertThrows(() => base52Enc(-1), Error);
  assertThrows(() => base52Enc(1.5), Error);
  assertThrows(() => base52Dec("_"), Error);
  assertThrows(() => base52Dec("a b"), Error);
});

Deno.test("base53 round-trips the documented vectors", () => {
  const vectors: Array<[number, string]> = [
    [0, "_"],
    [1, "a"],
    [2, "b"],
    [8, "h"],
    [50, "X"],
    [51, "Y"],
    [52, "Z"],
  ];
  for (const [num, str] of vectors) {
    assertStrictEquals(base53Enc(num), str);
    assertStrictEquals(base53Dec(str), num);
  }
  // Multi-digit carry: 53 * 1 + 0.
  assertStrictEquals(base53Enc(53), "a_");
  assertStrictEquals(base53Dec("a_"), 53);
});

Deno.test("base53 rejects invalid input", () => {
  assertThrows(() => base53Enc(-1), Error);
  assertThrows(() => base53Dec("0"), Error);
});

Deno.test("base64url round-trips the documented vectors", () => {
  const vectors: Array<[bigint, string]> = [
    [0n, "A"],
    [999n, "Pn"],
    [4095n, "__"],
    [4096n, "BAA"],
    [9999n, "CcP"],
  ];
  for (const [num, str] of vectors) {
    assertStrictEquals(base64UrlEnc(num), str);
    assertStrictEquals(base64UrlDec(str), num);
  }
  // Large payload transcribed from base-64url-enc.js.
  const big = BigInt(
    "01040706080719252428301704222622222323000000152005000015000028240011161922080104061008112426242830200824232224312626252321230005242225273122091720232710",
  );
  const encoded = base64UrlEnc(big);
  assertStrictEquals(
    encoded,
    "BRY8zuZS6-yuj6xgi-u9utYvXoK0QEXoKySIqr46g3-9HxEs1eG2VMHxerRFrXM3mjZxLkf-wwSvNRnQb88G",
  );
  assertStrictEquals(base64UrlDec(encoded), big);
});

Deno.test("base64url rejects invalid input", () => {
  assertThrows(() => base64UrlEnc(-1n), Error);
  assertThrows(() => base64UrlDec("!!!"), Error);
  let threw = false;
  try {
    base64UrlDec("H5yJn8tIS6hWuVfFgdJIY10GsuwXo0w!");
  } catch {
    threw = true;
  }
  assert(threw, "trailing invalid character must throw");
});
