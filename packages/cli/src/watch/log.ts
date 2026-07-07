import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ScreenActivity } from "@atoa/core";

/**
 * Local-only activity log. One JSONL file per day under ~/.atoa/watch —
 * this directory is the raw layer and is never synced anywhere.
 */

export const WATCH_DIR = join(homedir(), ".atoa", "watch");

export interface WatchEntry {
  ts: string;
  app: string;
  title: string;
  /** OCR text length before truncation — cheap "how much was on screen" signal. */
  chars: number;
  text: string;
}

const MAX_TEXT = 4000;

function dayFile(date = new Date()): string {
  return join(WATCH_DIR, `${date.toISOString().slice(0, 10)}.jsonl`);
}

export function appendEntry(e: Omit<WatchEntry, "chars"> & { text: string }): WatchEntry {
  const entry: WatchEntry = { ...e, chars: e.text.length, text: e.text.slice(0, MAX_TEXT) };
  mkdirSync(WATCH_DIR, { recursive: true });
  appendFileSync(dayFile(new Date(e.ts)), JSON.stringify(entry) + "\n", "utf8");
  return entry;
}

/** Fingerprint used to skip logging an unchanged screen (digits stripped so clocks don't defeat it). */
export function fingerprint(app: string, title: string, text: string): string {
  return `${app}|${title}|${text.replace(/[\d\s]/g, "").slice(0, 600)}`;
}

function readEntries(sinceDays: number): WatchEntry[] {
  if (!existsSync(WATCH_DIR)) return [];
  const cutoff = Date.now() - sinceDays * 86_400_000;
  const out: WatchEntry[] = [];
  for (const f of readdirSync(WATCH_DIR)) {
    if (!/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)) continue;
    if (new Date(f.slice(0, 10)).getTime() < cutoff - 86_400_000) continue;
    for (const line of readFileSync(join(WATCH_DIR, f), "utf8").split("\n")) {
      if (!line) continue;
      try {
        const e = JSON.parse(line) as WatchEntry;
        if (new Date(e.ts).getTime() >= cutoff) out.push(e);
      } catch {
        /* skip corrupt line */
      }
    }
  }
  return out;
}

/**
 * Aggregate the local log into the digest-safe summary. Only counts, shares
 * and hours come out of here — never OCR text or window titles.
 */
export function aggregate(sinceDays: number, intervalSeconds = 60): ScreenActivity | null {
  const entries = readEntries(sinceDays);
  if (entries.length === 0) return null;

  const byApp = new Map<string, number>();
  const byHour = new Map<number, number>();
  const days = new Set<string>();
  let first = entries[0].ts;
  let last = entries[0].ts;

  for (const e of entries) {
    byApp.set(e.app, (byApp.get(e.app) ?? 0) + 1);
    const d = new Date(e.ts);
    byHour.set(d.getHours(), (byHour.get(d.getHours()) ?? 0) + 1);
    days.add(e.ts.slice(0, 10));
    if (e.ts < first) first = e.ts;
    if (e.ts > last) last = e.ts;
  }

  const topApps = [...byApp.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, share: Math.round((n / entries.length) * 100) / 100 }));

  const peakHours = [...byHour.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => h);

  return {
    days: days.size,
    samples: entries.length,
    hoursActive: Math.round((entries.length * intervalSeconds) / 3600 * 10) / 10,
    topApps,
    peakHours,
    firstSample: first,
    lastSample: last,
  };
}
