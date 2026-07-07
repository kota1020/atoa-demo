import { execFileSync, execFile } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * On-device OCR via Apple Vision. The Swift helper is compiled once into
 * ~/.atoa/bin and reused; images are read locally and never uploaded anywhere.
 */

const BIN_DIR = join(homedir(), ".atoa", "bin");
const BIN = join(BIN_DIR, "atoa-ocr");

function swiftSource(): string {
  // Works from both src (tsx) and dist (tsup bundles to dist/index.js).
  const here = dirname(fileURLToPath(import.meta.url));
  for (const rel of ["../../native/ocr.swift", "../native/ocr.swift"]) {
    const p = join(here, rel);
    if (existsSync(p)) return p;
  }
  throw new Error("native/ocr.swift not found next to the CLI install");
}

/** Compile the helper if missing or older than its source. Requires Xcode CLT. */
export function ensureOcrHelper(): string {
  const src = swiftSource();
  if (existsSync(BIN) && statSync(BIN).mtimeMs >= statSync(src).mtimeMs) return BIN;
  mkdirSync(BIN_DIR, { recursive: true });
  execFileSync("swiftc", ["-O", "-o", BIN, src], { stdio: ["ignore", "ignore", "pipe"] });
  return BIN;
}

/** Recognize text in an image. Returns "" when nothing is legible. */
export function ocr(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(BIN, [imagePath], { maxBuffer: 8 * 1024 * 1024, timeout: 30_000 }, (err, stdout) => {
      if (err) reject(new Error(`ocr helper failed: ${err.message}`));
      else resolve(stdout.trim());
    });
  });
}
