import { assertStrictEquals } from "@std/assert";
import { encodeBasicData, parseBasicData } from "../src/basic-data/mod.ts";
import { decodeUrlToSvg, mergeUrlParams } from "../src/decode.ts";
import {
  bestMixEncode,
  parseAggregatedLinesData,
  parseLinesData,
} from "../src/encode/mod.ts";
import { encodeGroupColors } from "../src/group-colors/mod.ts";
import { encodeWidthsAndCounts } from "../src/widths-counts/mod.ts";

const FIX = new URL("./fixtures/", import.meta.url);
const GOLDEN = new URL("./fixtures/golden/", import.meta.url);
const read = (base: URL, name: string): string =>
  Deno.readTextFileSync(new URL(name, base)).trim();

// Phase 3 output goldens: byte-frozen library outputs. Each was verified
// byte-identical against the legacy pfpg implementation before freezing
// (decode SVGs, per-method encodes, bestMix, basic-data fragment), except
// the intended bigint64 fix (legacy yields NaN there).
Deno.test("finished query string is byte-stable", async () => {
  const basic = parseBasicData(
    JSON.parse(read(FIX, "basic-data.sample-uint5.json")),
  );
  const lines = parseLinesData(
    JSON.parse(read(FIX, "lines-data.sample-uint5.json")),
  );
  const agg = parseAggregatedLinesData(
    JSON.parse(read(FIX, "agg-data.sample-uint5.json")),
  );
  const { params } = await bestMixEncode({
    lines,
    agg,
    uintN: 5,
    widthsAndCounts: encodeWidthsAndCounts(agg),
    groupColors: encodeGroupColors(lines),
  });
  assertStrictEquals(
    mergeUrlParams(encodeBasicData(basic), params),
    read(GOLDEN, "fixture-202407_001.query.txt"),
  );
});

for (const art of ["showcase-202412_001", "showcase-202401_001"]) {
  for (
    const [pathMode, suffix] of [["relativeMerged", "rel"], [
      "absoluteSeparated",
      "abs",
    ]] as const
  ) {
    Deno.test(`decoded ${art} ${suffix} svg is byte-stable`, async () => {
      const search = read(FIX, `${art}.search.txt`);
      const { svg } = await decodeUrlToSvg(search, { pathMode });
      assertStrictEquals(svg, read(GOLDEN, `${art}.${suffix}.svg`));
    });
  }
}
