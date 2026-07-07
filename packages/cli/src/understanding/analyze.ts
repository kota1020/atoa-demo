import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CategoryScore, Understanding } from "../types.js";
import { scan } from "./scanner.js";
import { analyzeGit } from "./git.js";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Does the root (or any project) carry a README / mission-ish doc? */
function hasCompanyDocs(root: string): boolean {
  return ["README.md", "readme.md", "MISSION.md", "ABOUT.md", "docs"].some((f) =>
    existsSync(join(root, f)),
  );
}

/** Files that reveal who this person is (bio, resume, profile, notes). */
function hasBackgroundSignal(root: string): boolean {
  return ["README.md", "ABOUT.md", "PROFILE.md", "bio.md", "resume.md"].some((f) =>
    existsSync(join(root, f)),
  );
}

export function buildUnderstanding(root: string): Understanding {
  const { scope, extCounts, projects, files } = scan(root);
  const work = analyzeGit(root);

  // top 15 languages
  const languages: Record<string, number> = {};
  for (const [ext, n] of [...extCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    languages[ext] = n;
  }

  const categories: CategoryScore[] = [];

  // 1. Products & codebase — the strongest local signal.
  {
    const ev: string[] = [];
    let score = 0;
    if (scope.codeFiles > 0) {
      score = 30 + Math.min(55, Math.log10(scope.codeFiles + 1) * 28);
      ev.push(`${scope.codeFiles.toLocaleString()} code files across ${projects.length} project(s)`);
      const top = Object.keys(languages).slice(0, 3).join(", ");
      if (top) ev.push(`Primary languages: ${top}`);
      const described = projects.filter((p) => p.description).length;
      if (described) { score += 6; ev.push(`${described} project(s) carry a described manifest/README`); }
    } else {
      ev.push("No code files found in this scope");
    }
    categories.push({ key: "products_codebase", label: "Products & codebase", score: clamp(score), evidence: ev });
  }

  // 2. How you work & decide — from git history.
  {
    const ev: string[] = [];
    let score = 0;
    if (work && work.commits > 0) {
      score = 25 + Math.min(50, Math.log10(work.commits + 1) * 22);
      ev.push(`${work.commits.toLocaleString()} commits over ${work.activeDays} active days`);
      if (work.peakHour !== undefined) {
        const h = work.peakHour;
        const when = h >= 22 || h < 5 ? "late night" : h < 11 ? "morning" : h < 17 ? "afternoon" : "evening";
        ev.push(`Ships most in the ${when} (peak ~${String(h).padStart(2, "0")}:00)`);
      }
      if (work.nightShare > 0.3) { score += 4; ev.push(`Night owl — ${Math.round(work.nightShare * 100)}% of commits after 22:00`); }
      if (work.conventionalRate > 0.5) { score += 8; ev.push(`Disciplined commit style (${Math.round(work.conventionalRate * 100)}% conventional)`); }
      else ev.push(`Freeform commit messages (avg ${work.avgSubjectLength} chars)`);
    } else {
      ev.push("No git history in this scope — habit signals unavailable");
    }
    categories.push({ key: "how_you_work", label: "How you work & decide", score: clamp(score), evidence: ev });
  }

  // 3. Company & mission — from docs presence + breadth.
  {
    const ev: string[] = [];
    let score = 0;
    if (hasCompanyDocs(root)) { score += 45; ev.push("README / docs present to learn the mission from"); }
    if (scope.docs > 0) { score += Math.min(30, scope.docs * 2); ev.push(`${scope.docs} document file(s)`); }
    if (projects.length > 1) { score += 10; ev.push(`${projects.length} projects hint at the product surface area`); }
    if (score === 0) ev.push("No mission/company docs found locally");
    categories.push({ key: "company", label: "Company & mission", score: clamp(score), evidence: ev });
  }

  // 4. Your background & story — weak from code alone.
  {
    const ev: string[] = [];
    let score = 0;
    if (hasBackgroundSignal(root)) { score += 30; ev.push("Some profile/about docs found"); }
    else ev.push("Little personal-story signal in local files");
    categories.push({ key: "background", label: "Your background & story", score: clamp(score), evidence: ev });
  }

  // 5. Customers & relationships — rarely in a code repo.
  {
    const ev: string[] = [];
    const crmish = files.filter((f) => /customer|client|crm|contact|lead|deal/i.test(f)).length;
    let score = crmish > 0 ? Math.min(45, 15 + crmish * 3) : 0;
    ev.push(crmish > 0 ? `${crmish} file(s) reference customers/deals` : "No customer data in local files — connect Gmail/CRM to teach this");
    categories.push({ key: "customers", label: "Customers & relationships", score: clamp(score), evidence: ev });
  }

  // Weighted overall — codebase & work-style carry the most local weight.
  const weights: Record<string, number> = {
    products_codebase: 0.3, how_you_work: 0.25, company: 0.2, background: 0.1, customers: 0.15,
  };
  const overall = clamp(
    categories.reduce((sum, c) => sum + c.score * (weights[c.key] ?? 0), 0),
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    root,
    scope,
    languages,
    projects,
    workStyle: work,
    categories,
    overall,
  };
}

/** Load a persisted understanding digest if one exists. */
export function loadUnderstanding(path: string): Understanding | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Understanding;
  } catch {
    return null;
  }
}
