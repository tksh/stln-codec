import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  bestMixEncode,
  decodeUrlParams,
  decodeUrlToSvg,
  encodeBasicData,
  encodeGroupColors,
  encodeWidthsAndCounts,
  mergeUrlParams,
  parseAggregatedLinesData,
  parseBasicData,
  parseLinesData,
} from "../src/mod.ts";

const FIXTURES = new URL("./fixtures/", import.meta.url);

function readFixture(name: string): string {
  return Deno.readTextFileSync(new URL(name, FIXTURES)).trim();
}

Deno.test("decode uint5 showcase artwork (202412_001)", async () => {
  const search = readFixture("showcase-202412_001.search.txt");
  const data = await decodeUrlParams(search);
  assertStrictEquals(data.basicData.title, "202412_001");
  assertStrictEquals(data.linesData.size, 7);
  assertEquals(data.sizeData, { viewbox: "0 0 31 31", width: 31, height: 31 });
  const rel = await decodeUrlToSvg(search, { pathMode: "relativeMerged" });
  const abs = await decodeUrlToSvg(search, { pathMode: "absoluteSeparated" });
  assert(
    rel.svg.includes("<title>202412_001</title>"),
    "rel svg carries the title",
  );
  assert(rel.svg.includes("stroke-width"), "rel svg merges by width");
  assert(abs.svg.includes('<path d="M '), "abs svg separates lines");
});

Deno.test("decode uint7 showcase artwork (202401_001)", async () => {
  const search = readFixture("showcase-202401_001.search.txt");
  const data = await decodeUrlParams(search);
  assertStrictEquals(data.basicData.title, "202401_001");
  assertStrictEquals(data.linesData.size, 3);
  assertEquals(data.sizeData, {
    viewbox: "0 0 127 127",
    width: 127,
    height: 127,
  });
  for (const pathMode of ["relativeMerged", "absoluteSeparated"] as const) {
    const { svg } = await decodeUrlToSvg(search, { pathMode });
    assert(
      svg.includes("<title>202401_001</title>"),
      `${pathMode} svg carries the title`,
    );
    assert(!svg.includes("NaN"), `${pathMode} svg has no NaN coordinates`);
    assert(
      !svg.includes("undefined"),
      `${pathMode} svg has no undefined holes`,
    );
  }
});

Deno.test("uint5 fixtures round-trip encode -> merge -> decode losslessly", async () => {
  const basic = parseBasicData(
    JSON.parse(readFixture("basic-data.sample-uint5.json")),
  );
  const lines = parseLinesData(
    JSON.parse(readFixture("lines-data.sample-uint5.json")),
  );
  const agg = parseAggregatedLinesData(
    JSON.parse(readFixture("agg-data.sample-uint5.json")),
  );
  assertStrictEquals(lines.length, 2);
  assertStrictEquals(agg.length, 2);

  const uintN = 5;
  const args = {
    lines,
    agg,
    uintN,
    widthsAndCounts: encodeWidthsAndCounts(agg),
    groupColors: encodeGroupColors(lines),
  };
  const { params } = await bestMixEncode(args);
  const data = await decodeUrlParams(
    mergeUrlParams(encodeBasicData(basic), params),
  );

  assertStrictEquals(data.basicData.bits, "5");
  assertStrictEquals(data.linesData.size, lines.length);
  lines.forEach((group, index) => {
    const decoded = data.linesData.get(index);
    assert(decoded !== undefined, `group ${index} decoded`);
    assertEquals(
      decoded.absDvalsObj,
      group.d.absolute,
      `group ${index} absolute`,
    );
    assertEquals(
      decoded.relDvalsObj,
      group.d.relative,
      `group ${index} relative`,
    );
  });
  const { svg } = await decodeUrlToSvg(
    mergeUrlParams(encodeBasicData(basic), params),
    {
      pathMode: "relativeMerged",
    },
  );
  assert(
    svg.includes("<title>202407_001</title>"),
    "round-trip svg carries the title",
  );
});

Deno.test("decode rejects unknown encoding flags and empty input", async () => {
  await assertRejects(() => decodeUrlParams("?bits=~5&F=~91a-v"), Error);
  await assertRejects(() => decodeUrlParams("?title=x"), Error);
  assertThrows(() => mergeUrlParams("", "F=~1"), Error);
  assertThrows(() => mergeUrlParams("?bits=~5&", ""), Error);
  assertStrictEquals(mergeUrlParams("?bits=~5&", "F=~1"), "?bits=~5&F=~1");
});
