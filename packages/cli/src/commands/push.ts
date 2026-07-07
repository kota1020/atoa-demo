import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pc from "picocolors";
import type { Understanding } from "../types.js";
import { buildUnderstanding } from "../understanding/analyze.js";

export interface PushOptions {
  to?: string;
  token?: string;
  company?: string;
  /** Re-scan before pushing instead of using the saved digest. */
  fresh?: boolean;
}

const DEFAULT_API = "http://localhost:3200";

function loadDigest(root: string, fresh: boolean): Understanding {
  const digestPath = join(root, ".atoa", "understanding.json");
  if (!fresh && existsSync(digestPath)) {
    return JSON.parse(readFileSync(digestPath, "utf8")) as Understanding;
  }
  process.stderr.write(pc.dim(`No saved digest — scanning ${root} …\n`));
  return buildUnderstanding(root);
}

export async function runPush(target: string, opts: PushOptions): Promise<void> {
  const root = resolve(target || ".");
  const apiBase = (opts.to || process.env.ATOA_API_URL || DEFAULT_API).replace(/\/$/, "");
  const token = opts.token || process.env.ATOA_TOKEN;

  const u = loadDigest(root, Boolean(opts.fresh));

  const url = new URL(`${apiBase}/api/understanding`);
  if (opts.company) url.searchParams.set("company", opts.company);

  process.stderr.write(pc.dim(`Pushing digest (${u.overall}% overall) → ${url.origin} …\n`));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(u),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`push failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }

  const out = (await res.json()) as { company: string; overall: number };
  process.stdout.write(
    "\n" + pc.bold(pc.green("  Digest synced")) + "\n" +
    `  Company:  ${pc.bold(out.company)}\n` +
    `  Overall:  ${pc.bold(`${out.overall}%`)} understanding\n` +
    `  Endpoint: ${pc.dim(apiBase)}\n\n` +
    pc.dim("  Only the derived digest was sent — raw files never left this machine.\n\n"),
  );
}
