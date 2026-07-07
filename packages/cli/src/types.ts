/**
 * The shape of what an AI employee has learned about a company from local sources.
 * This is the "understanding digest" — derived summaries only, never raw file contents.
 * Raw files stay on the machine; only this digest is safe to sync to the cloud.
 */

export type CategoryKey =
  | "background"        // Your background & story
  | "company"          // Company & mission
  | "products_codebase" // Products & codebase
  | "customers"        // Customers & relationships
  | "how_you_work";    // How you work & decide

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  /** 0–100 confidence that the AI employee understands this area from local evidence. */
  score: number;
  /** Human-readable reasons the score is what it is. */
  evidence: string[];
}

export interface ProjectSummary {
  name: string;
  /** Path relative to the scan root. */
  path: string;
  kind: "node" | "python" | "rust" | "go" | "flutter" | "git" | "unknown";
  /** Primary languages by file count, most common first. */
  languages: string[];
  fileCount: number;
  /** One-line description pulled from README/manifest if present. */
  description?: string;
}

export interface WorkStyle {
  commits: number;
  activeDays: number;
  firstCommit?: string;
  lastCommit?: string;
  /** Local hour (0–23) with the most commits — when this person actually ships. */
  peakHour?: number;
  /** Share of commits between 22:00–05:00. High = night owl. */
  nightShare: number;
  /** 0–1: fraction of commit subjects following Conventional Commits (feat:, fix:…). */
  conventionalRate: number;
  avgSubjectLength: number;
  topAuthors: { name: string; commits: number }[];
}

export interface Scope {
  files: number;
  codeFiles: number;
  docs: number;
  bytes: number;
}

export interface Understanding {
  version: 1;
  generatedAt: string;
  root: string;
  scope: Scope;
  /** File extension → count, most common first (top 15). */
  languages: Record<string, number>;
  projects: ProjectSummary[];
  workStyle: WorkStyle | null;
  categories: CategoryScore[];
  /** Weighted overall understanding, 0–100. */
  overall: number;
}
