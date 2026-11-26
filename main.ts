// The Internet in One Word — entry generator.
// Picks the single word that best describes the whole internet and
// hands it to the harness through /output/entry.txt.
//
// Why this word: the internet's signature behaviour is not searching,
// posting, or shopping — it is the thumb that keeps scrolling long
// after the brain has checked out. One word, no explanation needed.

import { promises as fsp } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

// --- Tunables -------------------------------------------------------------

const ENTRY_SETTINGS = Object.freeze({
  // The chosen word: the endless, joyless scroll that ate the web.
  chosenWord: "doomscrolling",
  // Gate: entry.txt must be UTF-8 text of 1 to 30 chars, not only space.
  minChars: 1,
  maxChars: 30,
  // Where the harness expects the entry.
  outDirEnv: "MAKEFUN_OUTPUT_DIR",
  outDirFallback: "/output",
  outFile: "entry.txt",
});

// --- Validation helpers ---------------------------------------------------

// A word only counts if it is a single token with no spaces or newlines.
function isSingleToken(text: string): boolean {
  return text.length > 0 && !/\s/.test(text);
}

// The gate rejects blank entries and entries outside the 1-30 char window.
function validate(candidate: string): string {
  const trimmed = candidate.trim();
  if (trimmed.length < ENTRY_SETTINGS.minChars) {
    throw new Error("entry is empty");
  }
  if (trimmed.length > ENTRY_SETTINGS.maxChars) {
    throw new Error(
      `entry is ${trimmed.length} chars, over the ${ENTRY_SETTINGS.maxChars} limit`,
    );
  }
  if (!isSingleToken(trimmed)) {
    throw new Error("entry must be a single word");
  }
  if (!/^[a-z]+$/.test(trimmed)) {
    throw new Error("entry must be lowercase letters only");
  }
  return trimmed;
}

// --- Output helpers -------------------------------------------------------

// Resolve the output directory from the environment, defaulting to /output.
function resolveOutDir(): string {
  const fromEnv = process.env[ENTRY_SETTINGS.outDirEnv];
  return resolve(fromEnv && fromEnv.length > 0 ? fromEnv : ENTRY_SETTINGS.outDirFallback);
}

// Small fingerprint so the run log can prove which bytes were written.
function fingerprint(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12);
}

// Write the entry and read it back to prove the bytes landed intact.
async function publishEntry(word: string, outDir: string): Promise<string> {
  const checked = validate(word);
  await fsp.mkdir(outDir, { recursive: true });
  const target = join(outDir, ENTRY_SETTINGS.outFile);
  await fsp.writeFile(target, checked, "utf8");
  const roundTrip = await fsp.readFile(target, "utf8");
  if (roundTrip !== checked) {
    throw new Error("round-trip check failed: entry.txt differs from the word");
  }
  return target;
}

// --- Main -----------------------------------------------------------------

async function handIn(): Promise<void> {
  const outDir = resolveOutDir();
  const target = await publishEntry(ENTRY_SETTINGS.chosenWord, outDir);
  console.log(`entry written to ${target}`);
  console.log(`word: ${ENTRY_SETTINGS.chosenWord}`);
  console.log(`sha256 prefix: ${fingerprint(ENTRY_SETTINGS.chosenWord)}`);
}

handIn().catch((err: unknown) => {
  console.error(`failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
