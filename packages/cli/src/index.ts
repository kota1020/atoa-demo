#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runScan } from "./commands/scan.js";
import { runServe } from "./commands/serve.js";
import { runInit } from "./commands/init.js";
import { runPush } from "./commands/push.js";

const program = new Command();

program
  .name("atoa")
  .description(
    "AtoA — the local understanding engine.\n" +
    "Scans your files & code so your AI employee actually knows your company.\n" +
    "Raw files never leave your machine; only a derived digest can sync.",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Link a folder as a source your AI employee learns from")
  .argument("[dir]", "directory to watch", ".")
  .action((dir: string) => runInit(dir));

program
  .command("scan")
  .description("Read the folder and build the understanding digest")
  .argument("[dir]", "directory to scan", ".")
  .option("--json", "print the raw understanding JSON to stdout")
  .option("--out <dir>", "where to write the digest (default <dir>/.atoa)")
  .action((dir: string, opts: { json?: boolean; out?: string }) => runScan(dir, opts));

program
  .command("push")
  .description("Sync the understanding digest to your AtoA dashboard (digest only, never raw files)")
  .argument("[dir]", "directory whose digest to push", ".")
  .option("--to <url>", "API base URL (default $ATOA_API_URL or http://localhost:3200)")
  .option("--token <token>", "ingest token (default $ATOA_TOKEN)")
  .option("--company <id>", "company id on the dashboard")
  .option("--fresh", "re-scan before pushing instead of using the saved digest")
  .action(async (dir: string, opts: { to?: string; token?: string; company?: string; fresh?: boolean }) => {
    try {
      await runPush(dir, opts);
    } catch (e) {
      process.stderr.write(pc.red(`${(e as Error).message}\n`));
      process.exit(1);
    }
  });

program
  .command("serve")
  .description("Run the local MCP server so a cloud AI employee can query this machine")
  .argument("[dir]", "directory to serve", ".")
  .action(async (dir: string) => {
    try {
      await runServe(dir);
    } catch (e) {
      process.stderr.write(pc.red(`serve failed: ${(e as Error).message}\n`));
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((e) => {
  process.stderr.write(pc.red(`${(e as Error).message}\n`));
  process.exit(1);
});
