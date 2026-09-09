/**
 * String compression over Web Compression Streams, URI-component safe.
 *
 * Only the codec-needed subset of pfpg's `compression-stream.js` is ported;
 * `compressToBlob` (used by pfpg's download UI) stays in pfpg.
 */

let textEncoder: TextEncoder | undefined;
let textDecoder: TextDecoder | undefined;

function encoder(): TextEncoder {
  if (!textEncoder) textEncoder = new TextEncoder();
  return textEncoder;
}

function decoder(): TextDecoder {
  if (!textDecoder) textDecoder = new TextDecoder();
  return textDecoder;
}

async function runThrough(
  data: Uint8Array<ArrayBuffer>,
  transform: CompressionStream | DecompressionStream,
): Promise<ArrayBuffer> {
  // Start pulling before writing: the compressor applies backpressure, so
  // awaiting the write with an idle read side deadlocks.
  const result = new Response(transform.readable).arrayBuffer();
  const writer = transform.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return await result;
}

async function compressToBase64(
  input: string,
  method: CompressionFormat,
): Promise<string> {
  const bytes = new Uint8Array(
    await runThrough(encoder().encode(input), new CompressionStream(method)),
  );
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function decompressFromBase64(
  input: string,
  method: CompressionFormat,
): Promise<string> {
  const bytes = Uint8Array.from(atob(input), (c) => c.charCodeAt(0));
  const buffer = await runThrough(bytes, new DecompressionStream(method));
  return decoder().decode(buffer);
}

/** Compress, then encode base64url-style (no padding) for URL params. */
export async function compressToEncodedURIComponent(
  input: string,
  method: CompressionFormat,
): Promise<string> {
  return (await compressToBase64(input, method))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Restore padding/base64, then decompress. */
export async function decompressFromEncodedURIComponent(
  input: string,
  method: CompressionFormat,
): Promise<string> {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return await decompressFromBase64(base64, method);
}
