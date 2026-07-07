import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import ignore, { type Ignore } from "ignore";
import type { ProjectSummary, Scope } from "../types.js";

/** Directories we never descend into, regardless of .gitignore. */
const HARD_SKIP = new Set([
  ".git", "node_modules", ".next", "dist", "build", "out", ".turbo",
  ".venv", "venv", "__pycache__", ".cache", "target", ".dart_tool",
  "Pods", ".gradle", "coverage", ".vercel", ".idea", ".pnpm-store",
  // vendored / platform-embed noise — not part of the company's own work
  ".symlinks", ".plugin_symlinks", "ephemeral", "Flutter", "third_party",
  "vendor", "Carthage", "example", "examples", ".pub-cache", "DerivedData",
]);

const CODE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go",
  ".java", ".kt", ".swift", ".dart", ".rb", ".php", ".c", ".cpp", ".h",
  ".cs", ".vue", ".svelte", ".sql", ".sh", ".scss", ".css", ".html",
]);

const DOC_EXTS = new Set([
  ".md", ".mdx", ".txt", ".pdf", ".doc", ".docx", ".rtf", ".org",
  ".csv", ".json", ".yaml", ".yml", ".toml",
]);

export interface ScanResult {
  scope: Scope;
  extCounts: Map<string, number>;
  projects: ProjectSummary[];
  /** Files relative to root, code + docs only, for later MCP browsing. */
  files: string[];
}

/** Load a repo's ignore rules (.gitignore) if present. */
function loadIgnore(dir: string): Ignore {
  const ig = ignore();
  const gi = join(dir, ".gitignore");
  if (existsSync(gi)) {
    try {
      ig.add(readFileSync(gi, "utf8"));
    } catch {
      /* ignore unreadable gitignore */
    }
  }
  return ig;
}

function firstLine(text: string): string | undefined {
  for (const raw of text.split("\n")) {
    const line = raw.replace(/^#+\s*/, "").trim();
    if (line) return line.slice(0, 160);
  }
  return undefined;
}

/** Detect what kind of project a directory is from its manifest files. */
function detectProject(dir: string, relPath: string, fileCount: number, langs: string[]): ProjectSummary | null {
  const name = relPath === "" ? basename(dir) : basename(relPath);
  const has = (f: string) => existsSync(join(dir, f));
  let kind: ProjectSummary["kind"] = "unknown";
  let description: string | undefined;

  if (has("package.json")) {
    kind = "node";
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      description = pkg.description || undefined;
    } catch { /* malformed manifest */ }
  } else if (has("pubspec.yaml")) {
    kind = "flutter";
  } else if (has("Cargo.toml")) {
    kind = "rust";
  } else if (has("go.mod")) {
    kind = "go";
  } else if (has("requirements.txt") || has("pyproject.toml")) {
    kind = "python";
  } else if (existsSync(join(dir, ".git"))) {
    kind = "git";
  } else {
    return null;
  }

  if (!description) {
    const readme = ["README.md", "readme.md", "README.txt"].map((f) => join(dir, f)).find(existsSync);
    if (readme) {
      try { description = firstLine(readFileSync(readme, "utf8")); } catch { /* skip */ }
    }
  }

  return { name, path: relPath || ".", kind, languages: langs.slice(0, 4), fileCount, description };
}

export function scan(root: string): ScanResult {
  const scope: Scope = { files: 0, codeFiles: 0, docs: 0, bytes: 0 };
  const extCounts = new Map<string, number>();
  const projects: ProjectSummary[] = [];
  const files: string[] = [];

  // Per-project language tally, keyed by the project's relative dir.
  const projectLangs = new Map<string, Map<string, number>>();
  const projectFileCount = new Map<string, number>();
  const projectDirs: { abs: string; rel: string }[] = [];

  function walk(dir: string, ig: Ignore, projectRel: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // unreadable dir (permissions) — skip quietly
    }

    // A nested manifest starts a new sub-project scope.
    const rel = relative(root, dir);
    const isProjectRoot =
      dir === root ||
      ["package.json", "pubspec.yaml", "Cargo.toml", "go.mod", "pyproject.toml"].some((m) =>
        entries.includes(m),
      ) ||
      entries.includes(".git");
    if (isProjectRoot && !projectDirs.some((p) => p.abs === dir)) {
      projectDirs.push({ abs: dir, rel });
      projectRel = rel;
      projectLangs.set(rel, new Map());
      projectFileCount.set(rel, 0);
      ig = loadIgnore(dir); // nested repos get their own ignore rules
    }

    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".gitignore" && entry !== ".env.example") {
        if (HARD_SKIP.has(entry)) continue;
      }
      if (HARD_SKIP.has(entry)) continue;

      const abs = join(dir, entry);
      const relFromRoot = relative(root, abs);
      if (ig.ignores(relFromRoot) || ig.ignores(entry)) continue;

      let st;
      try { st = statSync(abs); } catch { continue; }

      if (st.isDirectory()) {
        walk(abs, ig, projectRel);
      } else if (st.isFile()) {
        const ext = extname(entry).toLowerCase();
        const isCode = CODE_EXTS.has(ext);
        const isDoc = DOC_EXTS.has(ext);
        if (!isCode && !isDoc) continue;

        scope.files++;
        scope.bytes += st.size;
        if (isCode) scope.codeFiles++;
        if (isDoc) scope.docs++;

        const key = ext || "(none)";
        extCounts.set(key, (extCounts.get(key) ?? 0) + 1);
        const pl = projectLangs.get(projectRel);
        if (pl) pl.set(key, (pl.get(key) ?? 0) + 1);
        projectFileCount.set(projectRel, (projectFileCount.get(projectRel) ?? 0) + 1);

        if (files.length < 20000) files.push(relFromRoot);
      }
    }
  }

  walk(root, loadIgnore(root), "");

  const seenProjectNames = new Set<string>();
  for (const { abs, rel } of projectDirs) {
    const langMap = projectLangs.get(rel) ?? new Map();
    const langs = [...langMap.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e);
    const count = projectFileCount.get(rel) ?? 0;
    if (count === 0) continue; // empty scope after ignores — not a real project here
    const proj = detectProject(abs, rel, count, langs);
    if (!proj) continue;
    // Collapse duplicates that vendored plugins create (same name, tiny scope).
    const dedupeKey = `${proj.name}:${proj.kind}`;
    if (seenProjectNames.has(dedupeKey) && proj.fileCount < 8) continue;
    seenProjectNames.add(dedupeKey);
    projects.push(proj);
  }

  projects.sort((a, b) => b.fileCount - a.fileCount);
  return { scope, extCounts, projects, files };
}
