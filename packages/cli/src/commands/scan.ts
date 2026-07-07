import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pc from "picocolors";
import { buildUnderstanding } from "../understanding/analyze.js";
import type { Understanding } from "../types.js";

const bar = (score: number, width = 22): string => {
  const filled = Math.round((score / 100) * width);
  const color = score >= 70 ? pc.green : score >= 45 ? pc.yellow : pc.red;
  return color("█".repeat(filled)) + pc.dim("░".repeat(width - filled));
};

export interface ScanOptions {
  json?: boolean;
  out?: string;
}

export function runScan(target: string, opts: ScanOptions): void {
  const root = resolve(target || ".");
  const started = Date.now();

  if (!opts.json) {
    process.stderr.write(pc.dim(`Reading ${root} …\n`));
  }

  const u = buildUnderstanding(root);

  // Persist the digest (derived summaries only — no raw file contents).
  const outDir = opts.out ? resolve(opts.out) : join(root, ".atoa");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "understanding.json");
  writeFileSync(outPath, JSON.stringify(u, null, 2));

  if (opts.json) {
    process.stdout.write(JSON.stringify(u, null, 2) + "\n");
    return;
  }

  printReport(u, outPath, Date.now() - started);
}

function printReport(u: Understanding, outPath: string, ms: number): void {
  const { scope } = u;
  const mb = (scope.bytes / 1024 / 1024).toFixed(1);
  const nl = "\n";
  let out = "";

  out += nl + pc.bold(pc.cyan("  AtoA — Understanding Report")) + nl;
  out += pc.dim(`  ${u.root}`) + nl + nl;

  out += pc.bold(`  Overall  `) + pc.bold(overallColor(u.overall)(`${u.overall}%`)) + "  " + bar(u.overall, 28) + nl + nl;

  for (const c of u.categories) {
    out += "  " + c.label.padEnd(26) + bar(c.score) + " " + String(c.score).padStart(3) + "%" + nl;
    for (const e of c.evidence) out += pc.dim(`      · ${e}`) + nl;
  }

  out += nl + pc.bold("  Scope") + nl;
  out += `      ${scope.files.toLocaleString()} files  ·  ${scope.codeFiles.toLocaleString()} code  ·  ${scope.docs.toLocaleString()} docs  ·  ${mb} MB` + nl;
  const langs = Object.entries(u.languages).slice(0, 6).map(([e, n]) => `${e} ${n}`).join("  ");
  if (langs) out += pc.dim(`      ${langs}`) + nl;

  if (u.projects.length) {
    out += nl + pc.bold(`  Projects (${u.projects.length})`) + nl;
    for (const p of u.projects.slice(0, 8)) {
      out += `      ${pc.bold(p.name)} ${pc.dim(`[${p.kind}]`)} ${pc.dim(`${p.fileCount} files`)}` + nl;
      if (p.description) out += pc.dim(`        ${p.description}`) + nl;
    }
    if (u.projects.length > 8) out += pc.dim(`      … +${u.projects.length - 8} more`) + nl;
  }

  if (u.workStyle) {
    const w = u.workStyle;
    out += nl + pc.bold("  Work style (from git)") + nl;
    out += `      ${w.commits.toLocaleString()} commits · ${w.activeDays} active days · peak ~${String(w.peakHour ?? 0).padStart(2, "0")}:00` + nl;
    out += pc.dim(`      ${Math.round(w.nightShare * 100)}% night · ${Math.round(w.conventionalRate * 100)}% conventional commits`) + nl;
  }

  out += nl + pc.green("  ✓ ") + `digest saved → ${pc.dim(outPath)}  ${pc.dim(`(${ms}ms)`)}` + nl;
  out += pc.dim("    raw files never left this machine. only this summary is safe to sync.") + nl;

  process.stdout.write(out);
}

const overallColor = (s: number) => (s >= 70 ? pc.green : s >= 45 ? pc.yellow : pc.red);
