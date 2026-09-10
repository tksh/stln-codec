/**
 * Flagged decompression: `~` verbatim, `0` URLCompressor, `1` deflate-raw.
 *
 * Async by necessity — the deflate-raw branch awaits `DecompressionStream`.
 * (pfpg's sync `tryDecompress` returned a `Promise` object for that branch;
 * see the migration plan §1.)
 */
import { decompressFromEncodedURIComponent } from "compression";
import { COMPRESSION_FLAGS } from "stln-constants";
import { decode as urlCompressorDecode } from "@tksh/url-compressor";

/** Decompress one flagged URL-param value. */
export async function tryDecompress(flagged: string): Promise<string> {
  if (flagged.startsWith(COMPRESSION_FLAGS.uncompressed)) {
    return flagged.slice(1);
  }
  if (flagged.startsWith(COMPRESSION_FLAGS.URLCompressor)) {
    const decoded = urlCompressorDecode(flagged.slice(1));
    if (decoded === null) {
      throw new Error("tryDecompress: URLCompressor failed to decode");
    }
    return decoded;
  }
  if (flagged.startsWith(COMPRESSION_FLAGS.deflateRaw)) {
    return await decompressFromEncodedURIComponent(
      flagged.slice(1),
      "deflate-raw",
    );
  }
  throw new Error(
    `tryDecompress: unknown compression flag in ${
      JSON.stringify(flagged.slice(0, 8))
    }`,
  );
}
