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

const XML_ESCAPABLE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

// XML 1.0 only permits #x9, #xA, #xD and the ranges below; characters outside
// that set invalidate the document. Replace them with U+FFFD so one is always
// well-formed. Done via code point iteration rather than a regex with raw
// control characters (which `deno lint` rejects).
const isXmlChar = (cp: number): boolean =>
  cp === 0x09 || cp === 0x0A || cp === 0x0D ||
  (cp >= 0x20 && cp <= 0xD7FF) ||
  (cp >= 0xE000 && cp <= 0xFFFD) ||
  (cp >= 0x10000 && cp <= 0x10FFFF);

const LONE_SURROGATES =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Escape text that is interpolated into the SVG as an XML text node. */
function escapeXmlText(value: string): string {
  let sanitized = "";
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    sanitized += isXmlChar(cp) ? ch : "\uFFFD";
  }
  return sanitized
    .replace(LONE_SURROGATES, "\uFFFD")
    .replace(/[&<>"']/g, (ch) => XML_ESCAPABLE[ch] ?? ch);
}

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
    { tag: "title", content: escapeXmlText(basicData.title ?? "") },
    { tag: "desc", content: escapeXmlText(basicData.desc ?? "") },
    // `<metadata>` is a container for an XML fragment (typically RDF), not
    // text; escaping it would serialize its markup as gibberish text. It is
    // validated as well-formed XML at ingress (`validateMetadataXml`), so it
    // is safe to embed verbatim.
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
