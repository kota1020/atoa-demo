import { readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildUnderstanding } from "../understanding/analyze.js";
import { scan } from "../understanding/scanner.js";

const MAX_READ_BYTES = 200_000;

/** Refuse any path that escapes the served root (path traversal guard). */
function safeResolve(root: string, rel: string): string | null {
  const abs = resolve(root, rel);
  const within = abs === root || abs.startsWith(root + sep);
  return within ? abs : null;
}

/**
 * `atoa serve` — expose the local machine's understanding to a cloud AI employee
 * over MCP (stdio). The brain can query and read on demand; nothing is uploaded.
 */
export async function runServe(target: string): Promise<void> {
  const root = resolve(target || ".");
  const { files } = scan(root);

  const server = new McpServer({ name: "atoa-local", version: "0.1.0" });

  server.registerTool(
    "get_understanding",
    {
      title: "Get understanding digest",
      description: "Return the scored understanding of this machine's files & code (categories, projects, work style).",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(buildUnderstanding(root), null, 2) }],
    }),
  );

  server.registerTool(
    "list_files",
    {
      title: "List files",
      description: "List known code/doc files, optionally filtered by a substring of the path.",
      inputSchema: {
        query: z.string().optional().describe("case-insensitive substring to filter paths"),
        limit: z.number().int().min(1).max(500).optional().describe("max results (default 100)"),
      },
    },
    async ({ query, limit }) => {
      const q = (query ?? "").toLowerCase();
      const hits = files.filter((f) => f.toLowerCase().includes(q)).slice(0, limit ?? 100);
      return { content: [{ type: "text", text: hits.join("\n") || "(no matches)" }] };
    },
  );

  server.registerTool(
    "read_file",
    {
      title: "Read file",
      description: "Read a single file's contents (truncated). Path is relative to the served root.",
      inputSchema: { path: z.string().describe("path relative to the served root") },
    },
    async ({ path }) => {
      const abs = safeResolve(root, path);
      if (!abs) return { isError: true, content: [{ type: "text", text: "Path is outside the served root." }] };
      try {
        const st = statSync(abs);
        if (!st.isFile()) return { isError: true, content: [{ type: "text", text: "Not a file." }] };
        let text = readFileSync(abs, "utf8");
        if (text.length > MAX_READ_BYTES) text = text.slice(0, MAX_READ_BYTES) + "\n… [truncated]";
        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: `Could not read: ${(e as Error).message}` }] };
      }
    },
  );

  server.registerTool(
    "search_code",
    {
      title: "Search code",
      description: "Grep-like search across known files for a literal string. Returns matching path:line snippets.",
      inputSchema: {
        pattern: z.string().describe("literal text to search for"),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ pattern, limit }) => {
      const needle = pattern.toLowerCase();
      const cap = limit ?? 60;
      const results: string[] = [];
      for (const f of files) {
        if (results.length >= cap) break;
        const abs = join(root, f);
        try {
          const lines = readFileSync(abs, "utf8").split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(needle)) {
              results.push(`${f}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
              if (results.length >= cap) break;
            }
          }
        } catch {
          /* binary or unreadable — skip */
        }
      }
      return { content: [{ type: "text", text: results.join("\n") || "(no matches)" }] };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`atoa-local MCP server ready · root=${root} · ${files.length} files indexed\n`);
}
