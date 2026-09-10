# stln-codec

Straightlines (`stln`) URL codec + SVG generator, written in TypeScript.

Straightlines ([spec](https://github.com/tksh/Straightlines)) is a focused SVG
subset for line art: drawings are groups of straight lines with unsigned-integer
coordinates. `stln-codec` converts between that artwork data and compact URL
parameters in both directions — data objects encode to query strings, and query
strings decode back to data objects and SVG documents. It is used in
[pfpg](https://github.com/tksh/pfpg) to share and render artworks through URLs.

The library is pure and dependency-light: no DOM, no filesystem, no network. Its
only runtime dependencies are
[`@tksh/url-compressor`](https://jsr.io/@tksh/url-compressor) and selected
[`@std/collections`](https://jsr.io/@std/collections) helpers.

## Features

- **Encode:** artwork JSON (`BasicData`, line groups, aggregated diff tables) →
  per-method payloads → per-group compression selection → finished `key=value&…`
  URL params.
- **Decode:** URL params → `{ basicData, linesData, sizeData }` → SVG strings in
  both Straightlines path modes (`absoluteSeparated`, `relativeMerged`).
- **Four d-value codecs** (`bruteforce53`, `bigint64`, `swap63`, `four16`) plus
  best-mix selection that keeps each group's shortest encoding.
- **Strict by design:** invalid flags, malformed payloads, and empty values
  throw instead of producing partial or garbage output.
- **Tested against production data:** the suite decodes real showcase artworks
  and round-trips sample data losslessly; frozen output goldens guard
  byte-stability (see `tests/fixtures/`, `scripts/freeze_goldens.ts`).

## Install

Requires [Deno](https://deno.com/).

```sh
deno add jsr:@tksh/stln-codec
```

```ts
import * as stln from "@tksh/stln-codec";
```

## Usage

### Decode URL params to SVG

```ts
// Works with a full query string (leading `?` optional) or URLSearchParams.
const { svg, data } = await stln.decodeUrlToSvg(
  "?bits=~5&title=~202412_001&…",
  {
    pathMode: "relativeMerged", // or "absoluteSeparated"
  },
);

console.log(data.sizeData); // { viewbox: "0 0 31 31", width: 31, height: 31 }
console.log(data.basicData.title); // "202412_001" (plain text, flags stripped)
document.querySelector("#artwork")!.innerHTML = svg;
```

`decodeUrlParams(search)` returns the same data object without rendering, for
callers that only need the values.

### Encode artwork JSON to URL params

```ts
import basicJson from "./202412_001_basic_data.json" with { type: "json" };
import linesJson from "./202412_001_lines_data.json" with { type: "json" };
import aggJson from "./202412_001_lines_data_aggregated_for_encoding.json" with {
  type: "json",
};

const basic = stln.parseBasicData(basicJson);
const lines = stln.parseLinesData(linesJson);
const agg = stln.parseAggregatedLinesData(aggJson);
const uintN = 5; // grid size class, e.g. 31x31

// Shared pre-encodings (group-color keys, width/count runs).
const widthsAndCounts = stln.encodeWidthsAndCounts(agg);
const groupColors = stln.encodeGroupColors(lines);

// Best encoding per group across all methods valid for this grid size.
const { params: linesParams } = await stln.bestMixEncode(
  { lines, agg, uintN, widthsAndCounts, groupColors },
);

// Finished query string: basic fragment + lines fragment.
const query = stln.mergeUrlParams(stln.encodeBasicData(basic), linesParams);
// "?bits=~5&title=~202412_001&…"
```

Single-method encoders (`encodeGroupsBruteforce53`, `encodeGroupsBigint64`,
`encodeGroupsSwap63`, `encodeGroupsFour16`) take the same argument object and
return each group's pair with its method/config provenance, for callers that
want one codec instead of the best mix.

### Value contract for basic data

A `~`-prefixed value claims to be already URI-safe and passes through verbatim
(the decoder strips exactly one `~`). Encoding a `~`-prefixed value that is
_not_ URI-safe throws — such input could never decode back. Other unsafe values
take the compressor path. On decode, a present-but-empty value throws; absent
optional keys are omitted (`bits` is required). See
[ARCHITECTURE.md](./ARCHITECTURE.md) for the full data flow.

## API reference

All entry points are re-exported from `src/mod.ts`:

| Module                                             | Contents                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                                         | `BasicData`, `LineGroup`, `AggregatedLinesData`, `DecodedParams`, `PathMode`, …                                             |
| `basic-data/`                                      | `parseBasicData`, `encodeBasicData`, `getBasicDataFromUrlParams`, `resolveUintN`                                            |
| `encode/`                                          | `parseLinesData`, `parseAggregatedLinesData`, `tryCompressDvals`, per-method encoders, `bestMixEncode`, `joinWithAmpersand` |
| `decode.ts`                                        | `decodeUrlParams`, `decodeUrlToSvg`, `mergeUrlParams`                                                                       |
| `svg/`                                             | `generateSvg`                                                                                                               |
| `bruteforce53/`, `bigint64/`, `swap63/`, `four16/` | d-value codecs (payload level)                                                                                              |
| `group-colors/`, `widths-counts/`                  | group attribute codecs                                                                                                      |
| `base-n/`                                          | `base52` / `base53` / base-64url primitives + alphabets                                                                     |
| `color/`                                           | hex/rgb/opacity helpers for group-color codes                                                                               |
| `constants.ts`                                     | basic-data keys, compression/encoding flags, SVG constants                                                                  |
| `compression.ts`, `flags.ts`                       | stream helpers, flagged `tryDecompress`                                                                                     |
| `size-data/`                                       | `calculateCanvasSize`, `sizeDataDec`, `relToAbs`                                                                            |

## Development

```sh
deno task test && deno task check && deno task lint && deno task fmt
```

`tests/fixtures/golden/` holds frozen outputs regenerated by
`scripts/freeze_goldens.ts`; `tests/golden_parity_test.ts` asserts they are
reproduced byte-for-byte. Fixture inputs under `tests/fixtures/` are byte-exact
copies of real artwork data — never reformat them (excluded in `deno.json`).

## License

[Mozilla Public License Version 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
