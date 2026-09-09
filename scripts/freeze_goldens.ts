/**
 * Freeze Phase 3 output goldens (library-only; committed).
 * Run: deno run --allow-read --allow-write scripts/freeze_goldens.ts
 * (writes tests/fixtures/golden/). These outputs were byte-compared
 * against the legacy pfpg implementation (see report) before freezing.
 */
import {
  bestMixEncode,
  parseAggregatedLinesData,
  parseLinesData,
} from "../src/encode/mod.ts";
import { encodeBasicData, parseBasicData } from "../src/basic-data/mod.ts";
import { encodeGroupColors } from "../src/group-colors/mod.ts";
import { encodeWidthsAndCounts } from "../src/widths-counts/mod.ts";
import { decodeUrlToSvg, mergeUrlParams } from "../src/decode.ts";

const FIX = new URL("../tests/fixtures/", import.meta.url);
const GOLDEN = new URL("../tests/fixtures/golden/", import.meta.url);
const read = (n: string): string =>
  Deno.readTextFileSync(new URL(n, FIX)).trim();
async function freeze(name: string, content: string): Promise<void> {
  await Deno.writeTextFile(new URL(name, GOLDEN), content + "\n");
  console.log(`froze ${name} (${content.length} bytes)`);
}
await Deno.mkdir(GOLDEN, { recursive: true });

// Finished query string for the uint5 sample artwork.
const basic = parseBasicData(JSON.parse(read("basic-data.sample-uint5.json")));
const lines = parseLinesData(JSON.parse(read("lines-data.sample-uint5.json")));
const agg = parseAggregatedLinesData(
  JSON.parse(read("agg-data.sample-uint5.json")),
);
const { params } = await bestMixEncode({
  lines,
  agg,
  uintN: 5,
  widthsAndCounts: encodeWidthsAndCounts(agg),
  groupColors: encodeGroupColors(lines),
});
await freeze(
  "fixture-202407_001.query.txt",
  mergeUrlParams(encodeBasicData(basic), params),
);

// Decoded SVGs for both production showcase artworks, both path modes.
for (const art of ["showcase-202412_001", "showcase-202401_001"]) {
  const search = read(`${art}.search.txt`);
  for (const pathMode of ["relativeMerged", "absoluteSeparated"] as const) {
    const { svg } = await decodeUrlToSvg(search, { pathMode });
    const suffix = pathMode === "relativeMerged" ? "rel" : "abs";
    await freeze(`${art}.${suffix}.svg`, svg);
  }
}
