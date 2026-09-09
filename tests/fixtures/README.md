# Conformance fixtures (vendored byte-exact copies)

Provenance: `pfpg` repo, `tests/fixtures/` (Phase 0 golden inputs, plan §8.6):

- `basic-data.sample-uint5.json`: `#textarea-basic-data-uploaded` placeholder.
- `lines-data.sample-uint5.json`: `#textarea-lines-data-uploaded` placeholder.
- `agg-data.sample-uint5.json`: `#textarea-agg-data-for-comp-uploaded`
  placeholder.
- `showcase-*.search.txt`: artwork query strings from `src/index.html`.

Do not edit: `tests/conformance_test.ts` decodes/round-trips these inputs.
