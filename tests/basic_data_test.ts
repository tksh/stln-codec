import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  encodeBasicData,
  getBasicDataFromUrlParams,
  parseBasicData,
  resolveUintN,
} from "../src/basic-data/mod.ts";
import { tryDecompress } from "../src/flags.ts";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "../src/compression.ts";

const SAMPLE_BASIC = {
  bits: "~5",
  version: "~0.9.0",
  title: "~202407_001",
  desc: "001kObPFhaNkBHUZJE0kMCGBFCDo8j7lBr_44z9CIqW3Ba7eLr9kVIlASMdS4",
  metadata:
    "01p0oUdqIavqvtRKIHBt6NXiYteLcXbRKDSYZxUvq0iChyl3QzjiOqHuFNm7Yh7FxvfVouHuyHlFtlgVicDtP0QQvacAuauchBVBSAEBNwHFyYnHE4H4_PlL_NK6Khs9Y5ezyZTNRNQ_W_6WDhCCM6aK8hNaYsOpzGHbeaeG3F2JmojjAptx43DpLkdJW00oFQfE5INinLI4DdJoihJpCqJQMjzKPwm_9zYGyxrbwuMwbEgFjmpCRxQjSlTyWDFVcWNbBbjOAOLuOGemZD9rQ-sm0wbSw2B2KWXiU4Om8IjjtKSetOWV1FeJ_PQWCCIHLWIk94kVci0Mb0sjy6hLB8cJw7OrRNcR7ug6bE5XdEY2RLhp8sti1jb1IJvN_fBMxgTwMYKVvYpwUsYcxwXAHWBOiYqxDZAAwrMxHYfqCUFEesGViQgV0RPPz9hveyyHZVvuoxNTuCgynDTlOGlynRt6nKeyDKeysp7LKdAcAlsViO2qJ3xx4HJpMEvIUiMIMsbl4xusWw5NbhGNVSG3ZB2yLYfkOHrGgzR7PJFcRBwjSK3LAb6gwpA77CwjH6Mp",
};

Deno.test("parseBasicData validates the JSON shape", () => {
  assertEquals(parseBasicData(SAMPLE_BASIC), SAMPLE_BASIC);
  assertThrows(() => parseBasicData(null), Error);
  assertThrows(() => parseBasicData([]), Error);
  assertThrows(() => parseBasicData({ title: "x" }), Error); // bits required
  assertThrows(() => parseBasicData({ bits: 5 }), Error);
});

Deno.test("encodeBasicData emits the canonical fragment", () => {
  // URI-safe values pass through verbatim, joined in key order.
  assertStrictEquals(
    encodeBasicData({ bits: "~7", title: "~202401_001" }),
    "?bits=~7&title=~202401_001&",
  );
  // Non-URI-safe values take the `~`-prefixed compressor path.
  const japanese = encodeBasicData({ bits: "~5", title: "日本語タイトル" });
  assert(japanese.startsWith("?bits=~5&title=~"), japanese);
  // include selects a subset, empties are skipped.
  assertStrictEquals(
    encodeBasicData({ bits: "~5", title: "", version: "~1" }, {
      include: ["title", "version", "bits"],
    }),
    "?version=~1&bits=~5&",
  );
});

Deno.test("basic data round-trips through URL params", async () => {
  // Encode passes flagged JSON through; decode strips flags to plain values
  // (SVG tags need plain text, e.g. `<title>202407_001</title>`).
  const fragment = encodeBasicData(SAMPLE_BASIC);
  assert(
    fragment.startsWith(
      "?bits=~5&version=~0.9.0&title=~202407_001&desc=001kObPF",
    ),
    fragment.slice(0, 60),
  );
  const decoded = await getBasicDataFromUrlParams(
    new URLSearchParams(fragment.slice(1)),
  );
  assertEquals(decoded.bits, "5");
  assertEquals(decoded.version, "0.9.0");
  assertEquals(decoded.title, "202407_001");
  assertEquals(
    decoded.desc,
    "A portrait of a woman based on an image from the Unsplash website",
  );
  assert(
    decoded.metadata?.startsWith("<rdf:RDF"),
    decoded.metadata?.slice(0, 20),
  );
  // NOTE (faithful upstream quirk): raw text takes the `~` + compressor
  // path on encode, but `~` decodes verbatim — so it comes back still
  // compressed. Only pre-encoded JSON values (like SAMPLE_BASIC) round-trip.
  const plain = { bits: "~5", title: " titre avec été " };
  const encodedPlain = encodeBasicData(plain);
  assert(
    encodedPlain.startsWith("?bits=~5&title=~"),
    encodedPlain,
  );
  const decodedPlain = await getBasicDataFromUrlParams(
    new URLSearchParams(encodedPlain.slice(1)),
  );
  assertEquals(decodedPlain.bits, "5");
  assertStrictEquals(
    decodedPlain.title,
    encodedPlain.split("title=~")[1]?.replace(/&$/, ""),
  );
  await assertRejects(
    () => getBasicDataFromUrlParams(new URLSearchParams("title=x")),
    Error,
  );
});

Deno.test("resolveUintN reads decoded bits", () => {
  assertStrictEquals(resolveUintN("5"), 5);
  assertThrows(() => resolveUintN(""), Error);
  assertThrows(() => resolveUintN("x"), Error);
  assertThrows(() => resolveUintN("5.5"), Error);
});

Deno.test("tryDecompress covers all three flag branches", async () => {
  assertStrictEquals(await tryDecompress("~hello"), "hello");
  const compressed = await compressToEncodedURIComponent(
    "hello world ".repeat(20),
    "deflate-raw",
  );
  assertStrictEquals(
    await tryDecompress("1" + compressed),
    "hello world ".repeat(20),
  );
  await assertRejects(() => tryDecompress("?hello"), Error);
});

Deno.test("deflate-raw compress/decompress inverts", async () => {
  const text = "The quick brown fox jumps over the lazy dog. ".repeat(10);
  const encoded = await compressToEncodedURIComponent(text, "deflate-raw");
  assertStrictEquals(
    await decompressFromEncodedURIComponent(encoded, "deflate-raw"),
    text,
  );
});
