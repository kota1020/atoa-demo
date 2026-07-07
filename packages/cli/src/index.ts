#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runScan } from "./commands/scan.js";
import { runServe } from "./commands/serve.js";
import { runInit } from "./commands/init.js";

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
