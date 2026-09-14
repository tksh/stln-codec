import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { decodeGroupColors } from "group-colors/mod";
import { expandGroupColor } from "@tksh/group-colors-param-codec";
import type { AggregatedLinesData, CoordRows, LineGroup } from "types";
import {
  bestMixEncode,
  defaultMethodsForUintN,
  encodeGroupsBigint64,
  encodeGroupsBruteforce53,
  encodeGroupsFour16,
  encodeGroupsSwap63,
  joinWithAmpersand,
  parseAggregatedLinesData,
  parseLinesData,
  tryCompressDvals,
} from "encode/mod";
import {
  decodeWidthsAndCounts,
  encodeWidthsAndCounts,
} from "widths-counts/mod";
import { encodeGroupColors } from "group-colors/mod";

const ROWS: CoordRows = { x1: [5], y1: [7], x2: [3], y2: [9] };

function lines(): LineGroup[] {
  return [{
    g_id: 0,
    g_stroke: { r: 255, g: 255, b: 255 },
    g_opacity: 255,
    g_stroke_opacity: 255,
    id: [0],
    stroke_width: [1],
    d: {
      absolute: { ...ROWS },
      relative: { x1: [5], y1: [7], x2: [-2], y2: [2] },
    },
  }];
}

function agg(): AggregatedLinesData[] {
  const empty: CoordRows = { x1: [], y1: [], x2: [], y2: [] };
  return [{
    g_id: 0,
    stroke_width: { widths: [1], counts: [1] },
    d: {
      absolute: {
        diff_by_row: { ...empty },
        frequent_diff_values_sorted: { ...empty },
        frequent_diff_counts_sorted: { ...empty },
      },
      relative: {
        diff_by_row: { x1: [5], y1: [7], x2: [-2], y2: [2] },
        frequent_diff_values_sorted: { ...empty },
        frequent_diff_counts_sorted: { ...empty },
      },
    },
  }];
}

function ctx(uintN = 5) {
  const lineGroups = lines();
  const aggGroups = agg();
  return {
    lines: lineGroups,
    agg: aggGroups,
    uintN,
    widthsAndCounts: encodeWidthsAndCounts(aggGroups),
    groupColors: encodeGroupColors(lineGroups),
  };
}

Deno.test("parseLinesData validates the lines JSON shape", () => {
  assertStrictEquals(
    parseLinesData(JSON.parse(JSON.stringify(lines()))).length,
    1,
  );
  assertThrows(() => parseLinesData({}), Error);
  assertThrows(() => parseLinesData([{ g_id: "0" }]), Error);
  assertThrows(
    () =>
      parseAggregatedLinesData([{
        g_id: 0,
        stroke_width: { widths: [1], counts: [1] },
      }]),
    Error,
  );
  assertStrictEquals(
    parseAggregatedLinesData(JSON.parse(JSON.stringify(agg()))).length,
    1,
  );
});

Deno.test("tryCompressDvals attaches color keys and compression flags", () => {
  const colors = new Map([[0, "F"]]);
  const widths = new Map([[0, "1a"]]);
  return tryCompressDvals({
    dvals: new Map([[0, "v"]]),
    widthsAndCounts: widths,
    groupColors: colors,
    method: "swap63",
  })
    .then(({ compressedByGroups, details }) => {
      // Tiny payload: uncompressed wins, flagged `~` + method flag `2`.
      assertStrictEquals(compressedByGroups.get(0), "F=~21a-v");
      assertEquals(details, [{
        gId: 0,
        before: 6,
        after: 6,
        method: "uncompressed",
      }]);
    });
});

Deno.test("tryCompressDvals reports savings on repetitive input", async () => {
  const colors = new Map([[0, "F"]]);
  const widths = new Map([[0, "1a"]]);
  const dval = "ab".repeat(300);
  const { compressedByGroups, details } = await tryCompressDvals({
    dvals: new Map([[0, dval]]),
    widthsAndCounts: widths,
    groupColors: colors,
    method: "bigint64",
  });
  const kv = compressedByGroups.get(0) as string;
  assert(kv.startsWith("F="), kv);
  const detail = details[0] as { before: number; after: number };
  assert(detail.after <= detail.before, `${detail.after} <= ${detail.before}`);
});

Deno.test("tryCompressDvals requires widths and colors per group", async () => {
  let threw = false;
  try {
    await tryCompressDvals({
      dvals: new Map([[9, "v"]]),
      widthsAndCounts: new Map(),
      groupColors: new Map(),
      method: "swap63",
    });
  } catch {
    threw = true;
  }
  assert(threw, "missing group must throw");
});

Deno.test("per-method encoders emit key=value pairs with provenance", async () => {
  const swap = await encodeGroupsSwap63(ctx());
  assertStrictEquals(swap.get(0)?.kvPair, "F=~21a-ACtx");
  assertStrictEquals(swap.get(0)?.method, "swap63");

  const big = await encodeGroupsBigint64(ctx());
  assertStrictEquals(big.get(0)?.kvPair, "F=~11a-TV3l");
  assertStrictEquals(big.get(0)?.method, "bigint64");
  assertEquals(big.get(0)?.config, { digitsPerChunk: 2 });

  const four = await encodeGroupsFour16(ctx());
  assertStrictEquals(four.get(0)?.method, "four16");
  assert((four.get(0)?.kvPair.length ?? 0) > 4, four.get(0)?.kvPair);

  const brut = await encodeGroupsBruteforce53(ctx());
  assertStrictEquals(brut.get(0)?.method, "bruteforce53");
  assert(
    "baseXNumber" in (brut.get(0)?.config ?? {}),
    JSON.stringify(brut.get(0)),
  );
});

Deno.test("bestMixEncode picks the shortest pair per group", async () => {
  assertEquals(defaultMethodsForUintN(5), [
    "bruteforce53",
    "bigint64",
    "four16",
    "swap63",
  ]);
  assertEquals(defaultMethodsForUintN(8), [
    "bruteforce53",
    "bigint64",
    "four16",
  ]);
  assertEquals(defaultMethodsForUintN(9), ["bruteforce53", "bigint64"]);
  const { params, byGroup } = await bestMixEncode(ctx());
  assertStrictEquals(byGroup.size, 1);
  const winner = byGroup.get(0);
  assert(winner !== undefined, "group 0 must be encoded");
  assertStrictEquals(params, winner.kvPair);
  assertStrictEquals(
    joinWithAmpersand(new Map([[0, "a=1"], [1, "b=2"]])),
    "a=1&b=2",
  );
  // Encoded colors/widths decode back to the inputs.
  const [colors, rest] = winner.kvPair.split("=");
  assertEquals(
    decodeGroupColors(expandGroupColor(colors as string)).gStrokeRgbStr,
    "rgb(255 255 255)",
  );
  assert(rest !== undefined && rest.length > 2, winner.kvPair);
  assertEquals(decodeWidthsAndCounts("1a").widths, [1]);
});
