import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pc from "picocolors";
import { captureScreen, frontmost, isBlocked } from "../watch/capture.js";
import { ensureOcrHelper, ocr } from "../watch/ocr.js";
import { WATCH_DIR, aggregate, appendEntry, fingerprint } from "../watch/log.js";

export interface WatchOptions {
  interval?: string;
  once?: boolean;
  report?: boolean;
  days?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function printReport(days: number): void {
  const a = aggregate(days);
  if (!a) {
    process.stdout.write(pc.yellow(`\n  No screen activity logged in the last ${days} day(s).\n`) +
      pc.dim(`  Start collecting with: atoa watch\n\n`));
    return;
  }
  process.stdout.write(
    "\n" + pc.bold(pc.cyan("  Screen activity")) + pc.dim(` — last ${days} day(s), aggregates only\n\n`) +
    `  Samples:      ${pc.bold(String(a.samples))} over ${a.days} day(s)  (~${a.hoursActive}h active)\n` +
    `  Peak hours:   ${pc.bold(a.peakHours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", "))}\n` +
    `  Top apps:\n` +
    a.topApps.map((t) => `    ${pc.bold(t.name.padEnd(24))} ${Math.round(t.share * 100)}%\n`).join("") +
    pc.dim(`\n  Raw log: ${WATCH_DIR} (stays on this machine)\n\n`),
  );
}

/**
 * Capture → on-device OCR → local JSONL. The screenshot is deleted right
 * after OCR; only text stays, and only aggregates ever reach a digest.
 */
async function tick(shot: string, lastPrint: { fp: string }): Promise<void> {
  const fg = await frontmost();
  const stamp = pc.dim(new Date().toTimeString().slice(0, 8));

  if (isBlocked(fg)) {
    process.stdout.write(`  ${stamp} ${pc.yellow("skipped")} ${fg.app} ${pc.dim("(private — not captured)")}\n`);
    return;
  }

  try {
    await captureScreen(shot);
    const text = await ocr(shot);
    const fp = fingerprint(fg.app, fg.title, text);
    if (fp === lastPrint.fp) {
      process.stdout.write(`  ${stamp} ${pc.dim(`unchanged — ${fg.app}`)}\n`);
      return;
    }
    lastPrint.fp = fp;
    appendEntry({ ts: new Date().toISOString(), app: fg.app, title: fg.title, text });
    process.stdout.write(
      `  ${stamp} ${pc.green("logged")} ${pc.bold(fg.app)}${fg.title ? pc.dim(` — ${fg.title.slice(0, 60)}`) : ""} ${pc.dim(`(${text.length} chars)`)}\n`,
    );
  } finally {
    rmSync(shot, { force: true });
  }
}

export async function runWatch(opts: WatchOptions): Promise<void> {
  const days = Math.max(1, Number(opts.days) || 7);
  if (opts.report) {
    printReport(days);
    return;
  }

  const intervalSec = Math.max(10, Number(opts.interval) || 60);

  process.stderr.write(pc.dim("Preparing on-device OCR helper …\n"));
  ensureOcrHelper();

  process.stdout.write(
    "\n" + pc.bold(pc.cyan("  AtoA watch")) + pc.dim(` — every ${intervalSec}s, on-device OCR\n`) +
    pc.dim(`  Raw text stays in ${WATCH_DIR}; screenshots are deleted immediately.\n`) +
    pc.dim(`  Needs macOS Screen Recording permission for your terminal to see real content.\n`) +
    pc.dim("  Stop with Ctrl-C.\n\n"),
  );

  const shot = join(tmpdir(), `atoa-watch-${process.pid}.png`);
  const last = { fp: "" };
  let stopped = false;
  process.on("SIGINT", () => {
    stopped = true;
    rmSync(shot, { force: true });
    process.stdout.write(pc.dim("\n  Stopped. See what it learned: atoa watch --report\n\n"));
    process.exit(0);
  });

  do {
    try {
      await tick(shot, last);
    } catch (e) {
      process.stderr.write(pc.red(`  capture failed: ${(e as Error).message}\n`));
    }
    if (!opts.once) await sleep(intervalSec * 1000);
  } while (!opts.once && !stopped);
}
