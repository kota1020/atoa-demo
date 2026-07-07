import { NextResponse } from "next/server";
import type { Understanding } from "@atoa/core";
import { DEFAULT_COMPANY, getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minimal shape check — enough to reject garbage without a full validator. */
function isUnderstanding(v: unknown): v is Understanding {
  if (!v || typeof v !== "object") return false;
  const u = v as Record<string, unknown>;
  return (
    u.version === 1 &&
    typeof u.overall === "number" &&
    Array.isArray(u.categories) &&
    typeof u.scope === "object"
  );
}

/**
 * Writes require a token when ATOA_INGEST_TOKEN is set (always set it in prod).
 * Unset = open ingest, acceptable only for local dev.
 */
function authorized(req: Request): boolean {
  const expected = process.env.ATOA_INGEST_TOKEN;
  if (!expected) return true;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

/** Ingest a digest from `atoa push`. Raw files never come through here — only the digest. */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Invalid or missing token. Pass --token or set ATOA_TOKEN." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (!isUnderstanding(body)) {
    return NextResponse.json(
      { error: "Not a valid understanding digest (expected version:1 with categories & scope)." },
      { status: 422 },
    );
  }

  const companyId = new URL(req.url).searchParams.get("company") || DEFAULT_COMPANY;
  try {
    await getStore().saveUnderstanding(companyId, body);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company: companyId, overall: body.overall });
}

/** Latest digest for a company — what the dashboard reads. */
export async function GET(req: Request) {
  const companyId = new URL(req.url).searchParams.get("company") || DEFAULT_COMPANY;
  const u = await getStore().latestUnderstanding(companyId);
  if (!u) return NextResponse.json({ error: "No understanding yet. Run `atoa scan` then `atoa push`." }, { status: 404 });
  return NextResponse.json(u);
}
