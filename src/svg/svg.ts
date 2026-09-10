/**
 * SVG generation from decoded params (Straightlines subset).
 *
 * Two path modes: `relativeMerged` (one `<path>` per stroke width, relative
 * `m` segments concatenated) and `absoluteSeparated` (one `<path>` per line,
 * absolute `M…L…`, grouped under per-width `<g>` elements). Note
 * `stroke-opacity` applies per group in the former, per line in the latter.
 */
import { TAB_SPACE } from "stln-constants";
import type {
  BasicData,
  DecodedGroup,
  DecodedParams,
  PathMode,
  SizeData,
} from "types";

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}

/** Generate the full SVG document for the given path mode. */
export function generateSvg(
  decoded: DecodedParams,
  opts: { pathMode: PathMode },
): string {
  const before = generateTagsBeforeStrokes(decoded.basicData, decoded.sizeData);
  const after = generateTagsAfterStrokes();
  const opens = generateGTagOpenByGroups(decoded.linesData);
  const closes = generateGTagCloseByGroups(decoded.linesData);
  const paths = opts.pathMode === "relativeMerged"
    ? generateRelPathTags(decoded.linesData)
    : generateAbsPathTags(decoded.linesData);
  const strokes: string[] = [];
  for (const gId of decoded.linesData.keys()) {
    const open = opens.get(gId);
    const path = paths.get(gId);
    const close = closes.get(gId);
    if (open === undefined || path === undefined || close === undefined) {
      throw new Error(`generateSvg: missing tags for group ${gId}`);
    }
    strokes.push(open, path, close);
  }
  return [...before, ...strokes, ...after].join("\n");
}

function generateRelPathTags(
  linesData: Map<number, DecodedGroup>,
): Map<number, string> {
  const byGroup = new Map<number, string>();
  for (const [gId, group] of linesData) {
    const { widths, firstlineIndices, lastlineIndices } = group.widthsAndCounts;
    const tags: string[] = [];
    for (let w = 0; w < widths.length; w++) {
      const width = widths[w];
      const first = (firstlineIndices[w] ?? NaN) - 1;
      const last = (lastlineIndices[w] ?? NaN) - 1;
      if (
        width === undefined || !Number.isInteger(first) ||
        !Number.isInteger(last)
      ) {
        throw new Error(`generateSvg: bad width run ${w} in group ${gId}`);
      }
      let dval = "";
      for (let i = first; i <= last; i++) {
        dval += `m ${group.relDvalsObj.x1[i]} ${group.relDvalsObj.y1[i]} ${
          group.relDvalsObj.x2[i]
        } ${group.relDvalsObj.y2[i]}`;
      }
      tags.push(
        `${TAB_SPACE.repeat(3)}<path stroke-width="${width}" d="${dval}" />`,
      );
    }
    byGroup.set(gId, tags.join("\n"));
  }
  return byGroup;
}

function generateAbsPathTags(
  linesData: Map<number, DecodedGroup>,
): Map<number, string> {
  const byGroup = new Map<number, string>();
  for (const [gId, group] of linesData) {
    const { widths, firstlineIndices, lastlineIndices } = group.widthsAndCounts;
    const tags: string[] = [];
    for (let w = 0; w < widths.length; w++) {
      const width = widths[w];
      const first = (firstlineIndices[w] ?? NaN) - 1;
      const last = (lastlineIndices[w] ?? NaN) - 1;
      if (
        width === undefined || !Number.isInteger(first) ||
        !Number.isInteger(last)
      ) {
        throw new Error(`generateSvg: bad width run ${w} in group ${gId}`);
      }
      const lines = [`${TAB_SPACE.repeat(3)}<g stroke-width="${width}">`];
      for (let i = first; i <= last; i++) {
        lines.push(
          `${TAB_SPACE.repeat(4)}<path d="M ${group.absDvalsObj.x1[i]} ${
            group.absDvalsObj.y1[i]
          } L ${group.absDvalsObj.x2[i]} ${group.absDvalsObj.y2[i]}" />`,
        );
      }
      lines.push(`${TAB_SPACE.repeat(3)}</g>`);
      tags.push(lines.join("\n"));
    }
    byGroup.set(gId, tags.join("\n"));
  }
  return byGroup;
}

function generateTagsBeforeStrokes(
  basicData: BasicData,
  sizeData: SizeData,
): string[] {
  const open =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sizeData.viewbox}" shape-rendering="crispEdges">`;
  const optional: Array<{ tag: string; content: string | undefined }> = [
    { tag: "title", content: basicData.title },
    { tag: "desc", content: basicData.desc },
    { tag: "metadata", content: indentMetadata(basicData.metadata) },
  ];
  const tags = optional
    .filter((entry): entry is { tag: string; content: string } =>
      isPresent(entry.content)
    )
    .map(({ tag, content }) => `${TAB_SPACE}<${tag}>${content}</${tag}>`);
  const defs = [
    `${TAB_SPACE}<defs>`,
    `${TAB_SPACE.repeat(2)}<clipPath id="shape-to-trim">`,
    `${TAB_SPACE.repeat(3)}<rect width="100%" height="100%" />`,
    `${TAB_SPACE.repeat(2)}</clipPath>`,
    `${TAB_SPACE}</defs>`,
  ].join("\n");
  return [
    open,
    ...tags,
    defs,
    `${TAB_SPACE}<g clip-path="url(#shape-to-trim)">`,
  ];
}

/** Indent multiline metadata for the nested position (no-op when absent). */
function indentMetadata(metadata: string | undefined): string | undefined {
  if (!isPresent(metadata)) return undefined;
  const indented = metadata.split("\n").map((line) =>
    `${TAB_SPACE.repeat(2)}${line}`
  );
  return `\n${indented.join("\n")}\n${TAB_SPACE}`;
}

function generateTagsAfterStrokes(): string[] {
  return [`${TAB_SPACE}</g>`, `</svg>`];
}

function generateGTagOpenByGroups(
  linesData: Map<number, DecodedGroup>,
): Map<number, string> {
  const byGroup = new Map<number, string>();
  for (const [gId, group] of linesData) {
    const colors = group.groupColors;
    byGroup.set(
      gId,
      `${
        TAB_SPACE.repeat(2)
      }<g id="${gId}" stroke="${colors.gStrokeRgbStr}" opacity="${colors.gOpacity}" stroke-opacity="${colors.gStrokeOpacity}">`,
    );
  }
  return byGroup;
}

function generateGTagCloseByGroups(
  linesData: Map<number, DecodedGroup>,
): Map<number, string> {
  const byGroup = new Map<number, string>();
  for (const [gId] of linesData) byGroup.set(gId, `${TAB_SPACE.repeat(2)}</g>`);
  return byGroup;
}
