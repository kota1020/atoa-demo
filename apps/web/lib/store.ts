import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Understanding } from "@atoa/core";

/**
 * Where understanding snapshots live. The app talks to this interface only —
 * dev uses a local JSON file, prod uses Supabase. Swapping is an env change,
 * not a code change.
 */
export interface Store {
  readonly kind: "file" | "supabase";
  saveUnderstanding(companyId: string, u: Understanding): Promise<void>;
  latestUnderstanding(companyId: string): Promise<Understanding | null>;
}

/* ----------------------------- File store (dev) ---------------------------- */

class FileStore implements Store {
  readonly kind = "file" as const;
  private dir = join(process.cwd(), ".data");

  private path(companyId: string) {
    const safe = companyId.replace(/[^a-z0-9_-]/gi, "_");
    return join(this.dir, `understanding-${safe}.json`);
  }

  async saveUnderstanding(companyId: string, u: Understanding): Promise<void> {
    if (!existsSync(this.dir)) await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(companyId), JSON.stringify(u, null, 2), "utf8");
  }

  async latestUnderstanding(companyId: string): Promise<Understanding | null> {
    try {
      return JSON.parse(await readFile(this.path(companyId), "utf8")) as Understanding;
    } catch {
      return null;
    }
  }
}

/* --------------------------- Supabase store (prod) ------------------------- */

class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  constructor(
    private url: string,
    private serviceKey: string,
  ) {}

  private async client() {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(this.url, this.serviceKey, { auth: { persistSession: false } });
  }

  async saveUnderstanding(companyId: string, u: Understanding): Promise<void> {
    const sb = await this.client();
    const { error } = await sb.from("understanding_snapshots").insert({
      company_id: companyId,
      overall: u.overall,
      digest: u,
      generated_at: u.generatedAt,
    });
    if (error) throw new Error(`supabase insert failed: ${error.message}`);
  }

  async latestUnderstanding(companyId: string): Promise<Understanding | null> {
    const sb = await this.client();
    const { data, error } = await sb
      .from("understanding_snapshots")
      .select("digest")
      .eq("company_id", companyId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`supabase select failed: ${error.message}`);
    return (data?.digest as Understanding) ?? null;
  }
}

/* -------------------------------- Selector -------------------------------- */

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? new SupabaseStore(url, key) : new FileStore();
  return cached;
}

export const DEFAULT_COMPANY = "default";
