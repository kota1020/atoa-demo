import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import pc from "picocolors";

interface AtoaConfig {
  version: 1;
  roots: string[];
  privacy: "local-only" | "sync-digest";
  linkedAt?: string;
}

const CONFIG_DIR = join(homedir(), ".atoa");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function readConfig(): AtoaConfig {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as AtoaConfig;
    } catch {
      /* fall through to default */
    }
  }
  return { version: 1, roots: [], privacy: "sync-digest" };
}

function writeConfig(cfg: AtoaConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export function runInit(target: string): void {
  const root = resolve(target || ".");
  const cfg = readConfig();
  if (!cfg.roots.includes(root)) cfg.roots.push(root);
  cfg.linkedAt = new Date().toISOString();
  writeConfig(cfg);

  process.stdout.write(
    "\n" + pc.bold(pc.cyan("  AtoA initialized")) + "\n" +
    `  Watching root: ${pc.bold(root)}\n` +
    `  Privacy mode:  ${pc.bold(cfg.privacy)} ${pc.dim("(raw files stay local; only the digest syncs)")}\n` +
    `  Config:        ${pc.dim(CONFIG_PATH)}\n\n` +
    "  Next:\n" +
    `    ${pc.green("atoa scan")}   ${pc.dim("— build the understanding digest")}\n` +
    `    ${pc.green("atoa serve")}  ${pc.dim("— run the local MCP server for your AI employee")}\n\n`,
  );
}

export { readConfig, CONFIG_PATH };
