import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { WorkStyle } from "../types.js";

/**
 * Derive "how you work" signals from git history. The demo claims files can't
 * teach how you work — but your commit history can: when you ship, how you
 * name things, how you break work down. This turns that into real evidence.
 */
export function analyzeGit(root: string): WorkStyle | null {
  if (!existsSync(join(root, ".git"))) return null;

  let raw: string;
  try {
    // hash | ISO date | author | subject   for up to 4000 recent commits
    raw = execFileSync(
      "git",
      ["-C", root, "log", "--no-merges", "-n", "4000", "--pretty=format:%H%x1f%aI%x1f%an%x1f%s"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return null; // no commits yet, or git not available
  }

  const lines = raw.split("\n").filter(Boolean);
  if (lines.length === 0) return null;

  const hourCounts = new Array(24).fill(0);
  const days = new Set<string>();
  const authors = new Map<string, number>();
  const convRe = /^(feat|fix|chore|docs|refactor|test|style|perf|build|ci|revert)(\(.+\))?!?:/i;
  let conventional = 0;
  let subjectLenTotal = 0;
  let night = 0;
  let first: string | undefined;
  let last: string | undefined;

  for (const line of lines) {
    const [, iso, author, subject = ""] = line.split("\x1f");
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      hourCounts[h]++;
      days.add(iso.slice(0, 10));
      if (h >= 22 || h < 5) night++;
      if (!last) last = iso.slice(0, 10); // log is newest-first
      first = iso.slice(0, 10);
    }
    authors.set(author, (authors.get(author) ?? 0) + 1);
    if (convRe.test(subject)) conventional++;
    subjectLenTotal += subject.length;
  }

  const commits = lines.length;
  let peakHour = 0;
  for (let h = 1; h < 24; h++) if (hourCounts[h] > hourCounts[peakHour]) peakHour = h;

  const topAuthors = [...authors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, c]) => ({ name, commits: c }));

  return {
    commits,
    activeDays: days.size,
    firstCommit: first,
    lastCommit: last,
    peakHour,
    nightShare: +(night / commits).toFixed(3),
    conventionalRate: +(conventional / commits).toFixed(3),
    avgSubjectLength: Math.round(subjectLenTotal / commits),
    topAuthors,
  };
}
