# `atoa` — the local understanding engine

The part of AtoA that makes "an AI employee who knows your company" real.

A web app can't read the files and code on your machine — so this CLI does. It
scans a folder, derives a structured **understanding digest** (what your
products are, how your codebase looks, *how you actually work* from git history),
and exposes it to a cloud AI employee over **MCP**.

**Privacy by design:** raw file contents never leave your machine. Only the
derived digest (`.atoa/understanding.json` — scores, project summaries, work-style
signals) is safe to sync. When the brain needs to read a specific file, it asks
the local MCP server, which serves it on demand.

## Commands

```bash
atoa init [dir]     # link a folder as a source your AI employee learns from
atoa scan [dir]     # read the folder → build & print the understanding digest
atoa scan --json    # emit raw understanding JSON (for piping / the backend)
atoa serve [dir]    # run the local MCP server so the cloud brain can query this machine
```

## What it understands (locally derivable)

| Category | Signal |
|---|---|
| Products & codebase | files, languages, detected projects & their manifests |
| **How you work & decide** | git history — when you ship, commit discipline, night-owl % |
| Company & mission | README / docs presence & breadth |
| Your background & story | profile/about docs (weak locally) |
| Customers & relationships | mostly needs Gmail/CRM — flagged as a gap to connect |

Each category gets a 0–100 score with human-readable evidence, plus a weighted
overall. This is what fills the onboarding "Understanding Report" with real data
instead of the demo's hard-coded 80%.

## MCP tools exposed by `atoa serve`

- `get_understanding` — the scored digest
- `list_files` — known code/doc paths (filterable)
- `read_file` — one file, truncated, path-traversal guarded
- `search_code` — literal grep across known files

## Dev

```bash
pnpm install
pnpm --filter @atoa/cli dev scan ~/some-repo   # run from source (tsx)
pnpm --filter @atoa/cli build                   # bundle to dist/
```
