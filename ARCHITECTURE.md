# Architecture

How `stln-codec` turns artwork data into URL params and back. For the
Straightlines rules themselves (grouped straight lines, unsigned-int
coordinates, path modes), see the [spec](https://github.com/tksh/Straightlines).

## Data model

- **`BasicData`** — non-lines params: `bits` (required, grid-size class), plus
  optional `version`, `title`, `desc`, `metadata` (SVG tag contents).
- **`LineGroup`** — one line group: `g_id`, `g_stroke` (RGB), `g_opacity`,
  `g_stroke_opacity`, per-line `id`/`stroke_width`, and `d` coordinates in both
  `absolute` (`M x1 y1 L x2 y2`) and `relative` (`m x1 y1 x2 y2`) forms.
- **`AggregatedLinesData`** — per-group stroke-width runs plus absolute/relative
  diff tables (`diff_by_row`, frequent-diff values/counts) that feed the d-value
  encoders.
- **`DecodedParams`** — decode result: `{ basicData, linesData, sizeData }`,
  where `linesData` maps group id → colors, encoding flag, width runs, encoded
  payload, and both decoded coordinate forms.

Group `id="0"` is the canvas background (one or two strokes); the canvas size
derives from its absolute coordinates.

## URL param layout

- Basic fragment: `?bits=~5&title=~202412_001&…` (values verbatim if URI-safe).
- One lines-data param per group: `[colors]=[1st][2nd][widths]-[dvals]`, joined
  with `&`. Example: `F=~21a-ACtx`.
  - `[colors]` — group colors shortened to 6|5|3|1 hex digits.
  - `[1st]` — compression flag: `~` verbatim, `0` URLCompressor, `1`
    deflate-raw.
  - `[2nd]` — d-value codec flag: `0` bruteforce53, `1` bigint64, `2` swap63,
    `3` four16.
  - `[widths]` — `[width, base53(count)]…` runs, e.g. `5b3d2h1ab`.
  - `[dvals]` — coordinates in the codec's format (below).

## Decode flow

1. Split the query into basic keys (`bits`, `version`, `title`, `desc`,
   `metadata`) and line-group entries (everything else, in order; group ids are
   positional, `0…n-1`).
2. Decompress each basic value per its 1st flag (`decodeUrlParams` is async
   because the deflate-raw branch awaits `DecompressionStream`). A
   present-but-empty value throws; absent optional keys are omitted.
3. Resolve `uintN` from decoded `bits` (e.g. `"5"` → `5`).
4. Per group, in order:
   1. Expand the param key to 10 hex digits and decode the group colors.
   2. Decompress the value, read the 2nd flag, and split `[widths]` from
      `[dvals]` at the first `-`.
   3. Decode widths/counts (base-53) and derive 1-based first/last line indices.
   4. Decode coordinates with the flagged codec (next section), producing both
      relative and absolute forms (`relToAbs`/`absToRel` convert between them,
      restarting at each width run's first line).
5. Derive the canvas size from group `0` (`sizeDataDec`, `viewBox: "0 0 w h"`).
6. `generateSvg(decoded, { pathMode })` renders the document:
   - `relativeMerged` — one `<path>` per stroke width with concatenated relative
     `m` segments;
   - `absoluteSeparated` — one `<path>` per line with `M…L…`, nested under
     per-width `<g>` elements.
   - Optional `<title>`/`<desc>`/`<metadata>` tags are emitted only when present
     (metadata re-indented for its nested position).

## Encode flow

1. Validate inputs (`parseBasicData`, `parseLinesData`,
   `parseAggregatedLinesData`) and pre-encode shared attributes
   (`encodeGroupColors`, `encodeWidthsAndCounts`).
2. Encode d-value payloads with one or all valid methods for the grid size
   (`defaultMethodsForUintN`: always `bruteforce53` + `bigint64`, plus `four16`
   at `uintN ≤ 8`, plus `swap63` at `uintN ≤ 5`):
   1. **bruteforce53** — per coordinate, a frequency dictionary of frequent
      diffs (base-52, capped at `52 − baseX` entries) plus a diff body mixing
      bare `[0-9]` digits, one-letter codebook hits, `_`-prefixed base-52 for
      out-of-range magnitudes, and two-letter base-X codes. Payload:
      `[base53(baseX)]-[freq]-[diff]-…`. The full encoder sweeps all 53 codebook
      sizes and keeps each group's shortest result.
   2. **bigint64** — absolute values zero-padded to a fixed width
      (`digitsPerChunk` from `uintN`), joined `x1+y1+x2+y2`, encoded as one
      base-64url bigint.
   3. **swap63** — each relative value in `[-31, 31]` swapped to one of 63
      characters (`0-9a-zA-Z_`); values outside the range throw.
   4. **four16** — custom base-16 over four 16-char sets: `[0:15]`/`[-15:-1]`
      take one char, `[16:255]`/`[-255:-16]` take two. Input is diff tables at
      `uintN ≤ 7`, relative values at `8`; anything else throws.
3. `tryCompressDvals` prepends `[2nd][widths]-` to each payload, tries it raw,
   URLCompressor-compressed, and deflate-raw-compressed, and keeps the shortest
   (ties prefer the earlier method), then prepends the 1st flag and the
   `colors=` key.
4. `bestMixEncode` keeps each group's shortest pair across methods and joins
   them with `&`; `mergeUrlParams` prepends the basic fragment for the finished
   query string.

## Error policy

The library never emits partial or garbage output: unknown flags, malformed
payloads, out-of-range values, undecodable codebooks, empty values, and
`~`-prefixed values containing non-URI-safe characters all throw `Error` before
anything is written. (Callers write results only after the codec returns, so a
throw inherently stops the pipeline.)
