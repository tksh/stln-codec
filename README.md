# stln-codec

Straightlines (`stln`) URL codec + SVG generator.

TypeScript library extracted from [pfpg](https://github.com/tksh/pfpg): encodes
Straightlines artwork data objects into URL parameters, and decodes URL
parameters back into data objects and SVG strings (both `absoluteSeparated` and
`relativeMerged` path modes). See the
[Straightlines ruleset](https://github.com/tksh/Straightlines) for the
underlying SVG subset specification.

Status: Phase 1 scaffold (see `pfpg`'s
`docs/stln-codec-and-typescript-migration-plan.md`). No codec functions yet —
`src/types.ts` holds the data model; Phase 2 ports the pure codec bottom-up.

## Use

```ts
import * as stln from "jsr:@tksh/stln-codec";
```

## Checks

```sh
deno task test && deno task check && deno task lint && deno task fmt
```

## License

[Mozilla Public License Version 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
