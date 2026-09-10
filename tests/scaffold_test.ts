import { assertEquals } from "@std/assert";
import type { BasicData, PathMode } from "stln-codec";

// Phase 1 scaffold test: data-model placeholder. Phase 2 replaces this with
// unit, round-trip, and golden conformance tests (plan Phase 2–3).
Deno.test("scaffold exposes the data model", () => {
  const basic: BasicData = { bits: "~5", title: "~202407_001" };
  const mode: PathMode = "absoluteSeparated";
  assertEquals(basic.bits, "~5");
  assertEquals(mode, "absoluteSeparated");
});
