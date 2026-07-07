import "./report.css";
import type { Understanding, WorkStyle } from "@atoa/core";
import { DEFAULT_COMPANY, getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const RADIUS = 72;
const CIRC = 2 * Math.PI * RADIUS;

function whenLabel(h: number): string {
  if (h >= 22 || h < 5) return "late night";
  if (h < 11) return "the morning";
  if (h < 17) return "the afternoon";
  return "the evening";
}

function workInsight(w: WorkStyle): string {
  const bits: string[] = [];
  if (w.peakHour !== undefined) bits.push(`ships most in ${whenLabel(w.peakHour)} (~${String(w.peakHour).padStart(2, "0")}:00)`);
  if (w.nightShare > 0.3) bits.push(`${Math.round(w.nightShare * 100)}% of commits land after 22:00`);
  bits.push(w.conventionalRate > 0.5 ? "keeps a disciplined commit style" : "writes freeform commits");
  return `This teammate ${bits.join(", ")}.`;
}

export default async function DashboardPage() {
  const u = await getStore().latestUnderstanding(DEFAULT_COMPANY);
  const storeKind = getStore().kind;

  if (!u) return <EmptyState storeKind={storeKind} />;
  return <Report u={u} storeKind={storeKind} />;
}

function EmptyState({ storeKind }: { storeKind: string }) {
  return (
    <main className="container">
      <div className="empty">
        <h1>Your AI employee hasn&apos;t learned anything yet.</h1>
        <p>Point the local engine at a folder, then push the digest. Raw files stay on your machine.</p>
        <pre className="code">
          <span className="c"># in the atoa repo</span>{"\n"}
          pnpm --filter @atoa/cli dev scan ~/your-repo{"\n"}
          pnpm --filter @atoa/cli dev push ~/your-repo{"\n"}
          <span className="c"># → refresh this page</span>
        </pre>
        <p className="src-line">Store: <b>{storeKind}</b></p>
      </div>
    </main>
  );
}

function Report({ u, storeKind }: { u: Understanding; storeKind: string }) {
  const offset = CIRC * (1 - u.overall / 100);
  const mb = (u.scope.bytes / 1024 / 1024).toFixed(1);
  const w = u.workStyle;

  return (
    <main className="container">
      <div className="head">
        <div className="eyebrow">Understanding Report</div>
        <h1>What your AI employee knows about your company</h1>
        <p>Derived from your files & code — real signal, not a hard-coded number. Only this digest left your machine.</p>
      </div>

      <div className="hero-row">
        <div className="ring-wrap">
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle className="ring-bg" cx="84" cy="84" r={RADIUS} />
            <circle
              className="ring-fg"
              cx="84"
              cy="84"
              r={RADIUS}
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="ring-center">
            <div className="big">{u.overall}%</div>
            <div className="lbl">Overall</div>
          </div>
        </div>
        <div className="hero-meta">
          <div className="scope">
            <div className="stat"><div className="n">{u.scope.files.toLocaleString()}</div><div className="l">Files</div></div>
            <div className="stat"><div className="n">{u.scope.codeFiles.toLocaleString()}</div><div className="l">Code</div></div>
            <div className="stat"><div className="n">{u.scope.docs.toLocaleString()}</div><div className="l">Docs</div></div>
            <div className="stat"><div className="n">{u.projects.length}</div><div className="l">Projects</div></div>
            <div className="stat"><div className="n">{mb}</div><div className="l">MB read</div></div>
          </div>
          <div className="langs">
            {Object.entries(u.languages).slice(0, 8).map(([ext, n]) => (
              <span className="lang-pill" key={ext}>{ext} {n}</span>
            ))}
          </div>
        </div>
      </div>

      <section className="panel">
        <h2>Understanding by area</h2>
        {u.categories.map((c) => (
          <div key={c.key}>
            <div className="cat">
              <span className="name">{c.label}</span>
              <span className="track"><span className={`fill${c.score < 45 ? " low" : ""}`} style={{ width: `${c.score}%` }} /></span>
              <span className="val">{c.score}%</span>
            </div>
            <ul className="cat-ev">
              {c.evidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        ))}
      </section>

      {u.projects.length > 0 && (
        <section className="panel">
          <h2>Projects it found ({u.projects.length})</h2>
          {u.projects.slice(0, 10).map((p) => (
            <div className="proj" key={p.path}>
              <span className="pn">{p.name}</span>
              <span className="pk">{p.kind}</span>
              <span className="pc">{p.fileCount.toLocaleString()} files · {p.languages.slice(0, 3).join(" ")}</span>
              {p.description && <span className="pd">{p.description}</span>}
            </div>
          ))}
        </section>
      )}

      {w && (
        <section className="panel">
          <h2>How you work &amp; decide — from git</h2>
          <div className="work-grid">
            <div className="work"><div className="n">{w.commits.toLocaleString()}</div><div className="l">Commits</div></div>
            <div className="work"><div className="n">{w.activeDays}</div><div className="l">Active days</div></div>
            <div className="work"><div className="n">{w.peakHour !== undefined ? `${String(w.peakHour).padStart(2, "0")}:00` : "—"}</div><div className="l">Peak ship hour</div></div>
            <div className="work"><div className="n">{Math.round(w.nightShare * 100)}%</div><div className="l">After 22:00</div></div>
            <div className="work"><div className="n">{Math.round(w.conventionalRate * 100)}%</div><div className="l">Conventional</div></div>
          </div>
          <div className="insight">💡 {workInsight(w)}</div>
        </section>
      )}

      <p className="stamp">
        Source root: <b>{u.root}</b> · generated {new Date(u.generatedAt).toLocaleString()} · store: {storeKind}
      </p>
    </main>
  );
}
