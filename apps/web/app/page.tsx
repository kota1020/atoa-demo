"use client";

import { useMemo, useState } from "react";

/* ============================================================
   AtoA — あなたを誰より理解するAI社員（デモUI / バックエンドなし）
   すべてのデータはダミーです。
   ============================================================ */

type Tone = "teal" | "amber" | "green" | "blue" | "rose" | "gray";
const TONE: Record<Tone, { fg: string; bg: string }> = {
  teal: { fg: "#0B7C78", bg: "#E6F6F5" },
  amber: { fg: "#B4740B", bg: "#FEF3E2" },
  green: { fg: "#15803D", bg: "#E7F6EC" },
  blue: { fg: "#1D4ED8", bg: "#E7EEFE" },
  rose: { fg: "#B42318", bg: "#FDECEC" },
  gray: { fg: "#6B7280", bg: "#F1F2F4" },
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: t.fg, background: t.bg }}
    >
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-[var(--surface)] ${className}`} style={{ borderColor: "var(--line)" }}>
      {children}
    </div>
  );
}

function Bar({ value, max, tone = "teal" as Tone }: { value: number; max: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full rounded-full" style={{ background: "var(--line)" }}>
      <div className="bar-fill h-2 rounded-full" style={{ width: `${pct}%`, background: TONE[tone].fg }} />
    </div>
  );
}

function Avatar({ init, tone = "amber" as Tone, size = 36 }: { init: string; tone?: Tone; size?: number }) {
  const t = TONE[tone];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-semibold"
      style={{ width: size, height: size, color: t.fg, background: t.bg, fontSize: size * 0.42 }}
    >
      {init}
    </div>
  );
}

const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

/* ------------------------- data ------------------------- */

const SOURCES = [
  { name: "ローカルフォルダ", icon: "📁", desc: "資料・ドキュメント", on: true },
  { name: "Gmail", icon: "✉️", desc: "顧客とのやり取り", on: false },
  { name: "Slack", icon: "💬", desc: "社内の会話", on: false },
  { name: "Notion", icon: "📓", desc: "議事録・Wiki", on: false },
  { name: "GitHub", icon: "🐙", desc: "コード・プロダクト", on: false },
  { name: "カレンダー", icon: "📅", desc: "予定・商談", on: false },
  { name: "LINE", icon: "💚", desc: "商談チャット", on: false },
  { name: "決済", icon: "💳", desc: "入出金・請求", on: false },
];

const UNDERSTANDING = [
  { label: "背景・ストーリー", pct: 89 },
  { label: "会社・ミッション", pct: 91 },
  { label: "プロダクト・コード", pct: 92 },
  { label: "顧客・関係", pct: 74 },
  { label: "働き方・意思決定", pct: 58 },
];

const THIS_WEEK = [
  { label: "進行中の商談", value: "3" },
  { label: "作成した資料", value: "12" },
  { label: "承認待ちの支払い", value: "1" },
];

const DEALS: { company: string; status: string; tone: Tone; value: number; note: string }[] = [
  { company: "株式会社アオゾラ", status: "交渉中", tone: "amber", value: 480000, note: "LINEグループで条件を調整中" },
  { company: "みらいフーズ", status: "提案送付", tone: "blue", value: 1200000, note: "提案書をハルが作成・送付" },
  { company: "ネクストラボ", status: "成約", tone: "green", value: 350000, note: "契約書に署名済み" },
];

const ACTIVITY = [
  { time: "9:12", text: "アオゾラ社のLINEグループに見積もりを送信" },
  { time: "8:40", text: "みらいフーズ向けの提案書 v2 を作成" },
  { time: "8:00", text: "本日の商談サマリをLINEに投稿" },
  { time: "昨日", text: "ネクストラボとの契約書の署名を回収" },
];

const YEAR = [
  { q: "Q1", plan: 3.0, actual: 2.6, done: true },
  { q: "Q2", plan: 4.0, actual: 4.3, done: true },
  { q: "Q3", plan: 5.5, actual: 2.1, done: false },
  { q: "Q4", plan: 7.0, actual: 0, done: false },
];

const SALES_WEEKS = [
  { w: "第1週", plan: 8, actual: 7 },
  { w: "第2週", plan: 8, actual: 9 },
  { w: "第3週", plan: 10, actual: 8 },
  { w: "第4週", plan: 10, actual: 11 },
  { w: "第5週", plan: 12, actual: 10 },
  { w: "今週", plan: 12, actual: 6 },
];

const PIPELINE: { company: string; stage: string; tone: Tone; value: number }[] = [
  { company: "みらいフーズ", stage: "提案", tone: "blue", value: 1200000 },
  { company: "株式会社アオゾラ", stage: "交渉", tone: "amber", value: 480000 },
  { company: "さくらシステム", stage: "商談", tone: "gray", value: 900000 },
  { company: "クラウドX", stage: "商談", tone: "gray", value: 300000 },
];

const FUNNEL = [
  { label: "サイト訪問", value: 12400 },
  { label: "登録", value: 396 },
  { label: "有効化", value: 214 },
  { label: "有料", value: 58 },
  { label: "継続（90日）", value: 41 },
];

const CONTRACTS: { name: string; party: string; status: string; tone: Tone; date: string }[] = [
  { name: "業務委託契約", party: "株式会社アオゾラ", status: "レビュー中", tone: "amber", date: "07/06" },
  { name: "基本契約", party: "みらいフーズ", status: "下書き", tone: "gray", date: "07/05" },
  { name: "NDA", party: "ネクストラボ", status: "署名済み", tone: "green", date: "07/02" },
  { name: "保守契約", party: "さくらシステム", status: "署名済み", tone: "green", date: "06/28" },
];

const PRODUCTS: { name: string; metric: string; trend: string; tone: Tone }[] = [
  { name: "ZeroGridアプリ", metric: "週間利用者 1,240", trend: "▲ 12%", tone: "green" },
  { name: "オンボーディングAPI", metric: "稼働率 99.9%", trend: "▲ 0.1%", tone: "green" },
  { name: "ランディングページ", metric: "登録率 3.2%", trend: "▼ 0.4%", tone: "rose" },
];

const PAY_HISTORY: { date: string; party: string; amount: number; status: string; tone: Tone }[] = [
  { date: "07/01", party: "クラウドX", amount: 88000, status: "完了", tone: "green" },
  { date: "06/28", party: "さくらシステム", amount: 220000, status: "完了", tone: "green" },
  { date: "06/20", party: "デザインワークス", amount: 45000, status: "完了", tone: "green" },
];

const AUTOMATIONS = [
  { name: "毎朝の商談サマリをLINEに投稿", last: "今日 8:00", on: true },
  { name: "新規リードに一次返信", last: "今日 9:12", on: true },
  { name: "請求書の発行とリマインド", last: "昨日 18:00", on: true },
  { name: "週次レポートを作成", last: "月曜 9:00", on: true },
  { name: "SNS投稿の下書き", last: "停止中", on: false },
];

const TEAM: { name: string; role: string; kind: "人間" | "AI"; status: string; init: string; tone: Tone }[] = [
  { name: "村上 晃太郎", role: "CEO", kind: "人間", status: "戦略・意思決定", init: "村", tone: "blue" },
  { name: "ハル", role: "営業 / AI社員", kind: "AI", status: "アオゾラ社と交渉中", init: "ハ", tone: "amber" },
];

const REPORTS = [
  { title: "みらいフーズ向け提案書 v2", type: "提案書", time: "今日 8:40" },
  { title: "6月度 営業レポート", type: "レポート", time: "07/01" },
  { title: "アオゾラ社 見積書", type: "見積", time: "昨日" },
];

const TABS = [
  { id: "home", label: "マイダッシュボード" },
  { id: "year", label: "事業計画" },
  { id: "sales", label: "営業" },
  { id: "funnel", label: "ファネル" },
  { id: "contracts", label: "契約" },
  { id: "products", label: "プロダクト" },
  { id: "payments", label: "支払い" },
  { id: "automation", label: "自動化" },
  { id: "team", label: "チーム" },
  { id: "reports", label: "レポート" },
  { id: "settings", label: "設定" },
];

/* ============================================================
   Top chrome (shared header)
   ============================================================ */

function TopChrome({ aiName, pct, minimal = false }: { aiName: string; pct: number; minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-[var(--surface)]/90 backdrop-blur" style={{ borderColor: "var(--line)" }}>
      <div className={`mx-auto flex h-14 items-center gap-3 px-5 ${minimal ? "max-w-3xl" : "max-w-6xl"}`}>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: "var(--teal)" }}>
            A
          </span>
          <span className="text-[15px] font-bold tracking-tight">AtoA</span>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Avatar init={aiName.slice(0, 1) || "ハ"} size={28} />
          <div className="leading-tight">
            <div className="text-xs font-semibold">{aiName}</div>
            <div className="text-[10px]" style={{ color: "var(--teal-ink)" }}>
              理解度 {pct}%
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   Onboarding
   ============================================================ */

function Onboarding({ aiName, setAiName, onDone }: { aiName: string; setAiName: (s: string) => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [sources, setSources] = useState(SOURCES.map((s) => s.on));
  const connected = sources.filter(Boolean).length;
  const overall = Math.round(UNDERSTANDING.reduce((a, b) => a + b.pct, 0) / UNDERSTANDING.length);

  return (
    <div className="min-h-screen">
      <TopChrome aiName={aiName} pct={overall} minimal />
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--ink-mute)" }}>
          {["迎える", "学ぶ", "理解レポート"].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span
                className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold"
                style={{ color: i <= step ? "#fff" : "var(--ink-mute)", background: i <= step ? "var(--teal)" : "var(--line)" }}
              >
                {i + 1}
              </span>
              <span style={{ color: i === step ? "var(--ink)" : "var(--ink-mute)" }}>{s}</span>
              {i < 2 && <span className="mx-1">—</span>}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">新しい仲間を迎えよう</h1>
            <p className="mt-2 text-[15px]" style={{ color: "var(--ink-mute)" }}>
              このAI社員が、あなたのファイル・コード・習慣・会話から学び、会社を誰よりも理解します。
            </p>
            <Card className="mt-7 p-6">
              <div className="flex items-center gap-4">
                <Avatar init={aiName.slice(0, 1) || "ハ"} size={64} />
                <div className="flex-1">
                  <label className="text-xs font-medium" style={{ color: "var(--ink-mute)" }}>
                    AI社員の名前
                  </label>
                  <input
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-lg font-semibold outline-none"
                    style={{ borderColor: "var(--line-strong)" }}
                  />
                </div>
              </div>
              <p className="mt-4 text-sm" style={{ color: "var(--ink-soft)" }}>
                担当：営業・提案・支払い交渉。あなたは最後に確認するだけ。
              </p>
            </Card>
            <div className="mt-7 flex items-center gap-3">
              <button onClick={() => setStep(1)} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--teal)" }}>
                オンボーディングを始める →
              </button>
              <button onClick={onDone} className="text-sm" style={{ color: "var(--ink-mute)" }}>
                スキップしてダッシュボードへ
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{aiName}は何から学ぶ？</h1>
            <p className="mt-2 text-[15px]" style={{ color: "var(--ink-mute)" }}>
              つなぐほど理解が深まります。あとから追加も削除もできます。
            </p>
            <div className="mt-3 text-sm font-medium" style={{ color: "var(--teal-ink)" }}>
              {connected} / {SOURCES.length} 件 接続済み
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOURCES.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setSources((p) => p.map((v, j) => (j === i ? !v : v)))}
                  className="flex items-center gap-3 rounded-xl border bg-white p-4 text-left"
                  style={{ borderColor: sources[i] ? "var(--teal)" : "var(--line)" }}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg text-xl" style={{ background: "var(--surface-2)" }}>
                    {s.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{s.name}</span>
                    <span className="block text-xs" style={{ color: "var(--ink-mute)" }}>
                      {s.desc}
                    </span>
                  </span>
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold"
                    style={{ color: sources[i] ? "#fff" : "var(--ink-mute)", background: sources[i] ? "var(--teal)" : "var(--line)" }}
                  >
                    {sources[i] ? "✓" : "+"}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-7 flex items-center gap-3">
              <button onClick={() => setStep(0)} className="text-sm" style={{ color: "var(--ink-mute)" }}>
                ← 戻る
              </button>
              <button onClick={() => setStep(2)} className="ml-auto rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--teal)" }}>
                次へ：読み込み →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">理解レポート</h1>
            <p className="mt-2 text-[15px]" style={{ color: "var(--ink-mute)" }}>
              {aiName}が読み込んだ内容から、会社をこう理解しました。
            </p>

            <Card className="mt-6 p-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--ink-mute)" }}>
                    総合理解度
                  </div>
                  <div className="mt-1 text-4xl font-bold tabular">{overall}%</div>
                </div>
                <div className="text-right text-xs" style={{ color: "var(--ink-mute)" }}>
                  {connected} / {SOURCES.length} ソースから学習
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {UNDERSTANDING.map((u) => (
                  <div key={u.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span style={{ color: "var(--ink-soft)" }}>{u.label}</span>
                      <span className="tabular font-medium">{u.pct}%</span>
                    </div>
                    <Bar value={u.pct} max={100} tone={u.pct < 70 ? "amber" : "teal"} />
                  </div>
                ))}
              </div>
            </Card>

            <div className="mt-4 flex items-start gap-3 rounded-xl p-4" style={{ background: "var(--amber-soft)" }}>
              <span>⚠️</span>
              <p className="text-sm" style={{ color: "#7a5a12" }}>
                「働き方・意思決定」がまだ盲点です（58%）。画面共有で仕事の進め方を見せると、ここが一気に埋まります。
              </p>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <button onClick={() => setStep(1)} className="text-sm" style={{ color: "var(--ink-mute)" }}>
                ← 戻る
              </button>
              <button onClick={onDone} className="ml-auto rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--teal)" }}>
                雇用して稼働開始 →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ============================================================
   Dashboard
   ============================================================ */

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {sub && (
        <p className="mt-0.5 text-sm" style={{ color: "var(--ink-mute)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Dashboard({ aiName, onReset }: { aiName: string; onReset: () => void }) {
  const [tab, setTab] = useState("home");
  const overall = useMemo(() => Math.round(UNDERSTANDING.reduce((a, b) => a + b.pct, 0) / UNDERSTANDING.length), []);

  return (
    <div className="min-h-screen">
      <TopChrome aiName={aiName} pct={overall} />
      <div className="sticky top-14 z-10 border-b bg-[var(--bg)]/90 backdrop-blur" style={{ borderColor: "var(--line)" }}>
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="whitespace-nowrap px-3 py-3 text-sm font-medium"
                style={{ color: active ? "var(--ink)" : "var(--ink-mute)", borderBottom: active ? "2px solid var(--teal)" : "2px solid transparent" }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-7">
        {tab === "home" && <HomeTab aiName={aiName} />}
        {tab === "year" && <YearTab />}
        {tab === "sales" && <SalesTab />}
        {tab === "funnel" && <FunnelTab />}
        {tab === "contracts" && <ContractsTab />}
        {tab === "products" && <ProductsTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "automation" && <AutomationTab />}
        {tab === "team" && <TeamTab aiName={aiName} />}
        {tab === "reports" && <ReportsTab />}
        {tab === "settings" && <SettingsTab aiName={aiName} overall={overall} onReset={onReset} />}
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-xs" style={{ color: "var(--ink-mute)" }}>
        AtoA — デモUI / バックエンドなし・データはすべてダミーです
      </footer>
    </div>
  );
}

/* ------------------------- tabs ------------------------- */

function HomeTab({ aiName }: { aiName: string }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar init={aiName.slice(0, 1) || "ハ"} size={40} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{aiName}</span>
              <Pill tone="teal">稼働中</Pill>
            </div>
            <div className="text-sm" style={{ color: "var(--ink-mute)" }}>
              A2A商談 進行中 — アオゾラ社とLINEグループで交渉中
            </div>
          </div>
          <a className="ml-auto text-sm font-medium" style={{ color: "var(--teal-ink)" }} href="#">
            LINEで会話を見る ↗
          </a>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            placeholder="なんでも頼んで！営業・資料・リサーチ… 💪"
            className="flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--line-strong)" }}
          />
          <button className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--teal)" }}>
            依頼する
          </button>
        </div>
      </Card>

      <div>
        <SectionHead title="今週" />
        <div className="grid grid-cols-3 gap-3">
          {THIS_WEEK.map((m) => (
            <Card key={m.label} className="p-4">
              <div className="text-xs" style={{ color: "var(--ink-mute)" }}>
                {m.label}
              </div>
              <div className="mt-1 text-2xl font-bold tabular">{m.value}</div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHead title="商談" sub={`${aiName}が交渉・提案を進めています`} />
          <div className="space-y-3">
            {DEALS.map((d) => (
              <Card key={d.company} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{d.company}</span>
                    <Pill tone={d.tone}>{d.status}</Pill>
                  </div>
                  <div className="mt-0.5 text-sm" style={{ color: "var(--ink-mute)" }}>
                    {d.note}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular font-semibold">{yen(d.value)}</div>
                  <button className="mt-1 text-xs font-medium" style={{ color: "var(--teal-ink)" }}>
                    開く
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <SectionHead title="承認待ち" />
          <Card className="p-5">
            <div className="text-xs" style={{ color: "var(--ink-mute)" }}>
              支払いリンクの承認（APA）
            </div>
            <div className="mt-1 text-3xl font-bold tabular">{yen(480000)}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--ink-mute)" }}>
              株式会社アオゾラ
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--teal)" }}>
                承認
              </button>
              <button className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--line-strong)", color: "var(--ink-soft)" }}>
                後で
              </button>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <SectionHead title="最近の動き" />
        <Card>
          {ACTIVITY.map((a, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
              <span className="w-12 shrink-0 text-xs tabular" style={{ color: "var(--ink-mute)" }}>
                {a.time}
              </span>
              <span className="text-sm">{a.text}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function YearTab() {
  const max = 7.5;
  return (
    <div>
      <SectionHead title="事業計画 — 成長の道すじ" sub="2026年 四半期ごとの売上目標（計画 vs 実績・単位：百万円）" />
      <Card className="p-6">
        <div className="grid grid-cols-4 gap-5">
          {YEAR.map((y) => (
            <div key={y.q}>
              <div className="flex h-40 items-end justify-center gap-2">
                <div className="w-6 rounded-t" style={{ height: `${(y.plan / max) * 100}%`, background: "var(--line-strong)" }} />
                <div
                  className="bar-fill w-6 rounded-t"
                  style={{ height: `${(y.actual / max) * 100}%`, background: y.actual >= y.plan ? "var(--green)" : "var(--teal)" }}
                />
              </div>
              <div className="mt-2 text-center">
                <div className="text-sm font-semibold">{y.q}</div>
                <div className="text-xs tabular" style={{ color: "var(--ink-mute)" }}>
                  {y.done ? `実績 ${y.actual}M` : y.actual ? `進行中 ${y.actual}M` : "予定"}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-5 text-xs" style={{ color: "var(--ink-mute)" }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--line-strong)" }} /> 計画
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--teal)" }} /> 実績
          </span>
        </div>
      </Card>
    </div>
  );
}

function SalesTab() {
  const max = 14;
  return (
    <div className="space-y-6">
      <SectionHead title="営業" sub="AI社員が回す。あなたは確認だけ。（週次の商談件数：計画 vs 実績）" />
      <Card className="p-6">
        <div className="flex h-44 items-end gap-4">
          {SALES_WEEKS.map((s) => (
            <div key={s.w} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                <div className="w-4 rounded-t" style={{ height: `${(s.plan / max) * 100}%`, background: "var(--line-strong)" }} />
                <div
                  className="bar-fill w-4 rounded-t"
                  style={{ height: `${(s.actual / max) * 100}%`, background: s.actual >= s.plan ? "var(--green)" : "var(--teal)" }}
                />
              </div>
              <div className="text-xs" style={{ color: "var(--ink-mute)" }}>
                {s.w}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <SectionHead title="パイプライン" />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--ink-mute)" }} className="text-left text-xs">
                <th className="px-4 py-3 font-medium">会社</th>
                <th className="px-4 py-3 font-medium">ステージ</th>
                <th className="px-4 py-3 text-right font-medium">想定金額</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE.map((p) => (
                <tr key={p.company} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-3 font-medium">{p.company}</td>
                  <td className="px-4 py-3">
                    <Pill tone={p.tone}>{p.stage}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{yen(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function FunnelTab() {
  const max = FUNNEL[0].value;
  return (
    <div>
      <SectionHead title="ファネル" sub="顧客がどこで離れるか。直すのはその一段だけ。" />
      <Card className="p-6">
        <div className="space-y-3">
          {FUNNEL.map((f, i) => {
            const pct = (f.value / max) * 100;
            const conv = i === 0 ? 100 : Math.round((f.value / FUNNEL[i - 1].value) * 100);
            return (
              <div key={f.label} className="flex items-center gap-4">
                <div className="w-28 shrink-0 text-sm" style={{ color: "var(--ink-soft)" }}>
                  {f.label}
                </div>
                <div className="flex-1">
                  <div
                    className="bar-fill flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-white"
                    style={{ width: `${Math.max(pct, 14)}%`, background: "var(--teal)" }}
                  >
                    {f.value.toLocaleString("ja-JP")}
                  </div>
                </div>
                <div
                  className="w-14 shrink-0 text-right text-xs tabular"
                  style={{ color: i > 0 && conv < 60 ? "var(--rose)" : "var(--ink-mute)" }}
                >
                  {i === 0 ? "—" : `${conv}%`}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-sm" style={{ color: "var(--ink-mute)" }}>
          最大の離脱は「登録 → 有効化」。ここを直すのが最優先です。
        </p>
      </Card>
    </div>
  );
}

function ContractsTab() {
  return (
    <div>
      <SectionHead title="契約" sub="AI社員が起案・追跡します。" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: "var(--ink-mute)" }} className="text-left text-xs">
              <th className="px-4 py-3 font-medium">書類</th>
              <th className="px-4 py-3 font-medium">相手先</th>
              <th className="px-4 py-3 font-medium">状態</th>
              <th className="px-4 py-3 text-right font-medium">更新</th>
            </tr>
          </thead>
          <tbody>
            {CONTRACTS.map((c) => (
              <tr key={c.name + c.party} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>
                  {c.party}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={c.tone}>{c.status}</Pill>
                </td>
                <td className="px-4 py-3 text-right tabular" style={{ color: "var(--ink-mute)" }}>
                  {c.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ProductsTab() {
  return (
    <div>
      <SectionHead title="プロダクト" sub="会社が届けるもの（コードから学習）" />
      <div className="grid gap-3 sm:grid-cols-3">
        {PRODUCTS.map((p) => (
          <Card key={p.name} className="p-5">
            <div className="text-sm font-semibold">{p.name}</div>
            <div className="mt-3 text-xl font-bold tabular">{p.metric}</div>
            <div className="mt-1 text-sm font-medium" style={{ color: TONE[p.tone].fg }}>
              {p.trend}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PaymentsTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="支払い" sub="エージェント同士が条件に合意、あなたはリンクを承認するだけ（APA）" />
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <Pill tone="amber">承認待ち</Pill>
            <div className="mt-2 text-2xl font-bold tabular">{yen(480000)}</div>
            <div className="text-sm" style={{ color: "var(--ink-mute)" }}>
              株式会社アオゾラ ・ 業務委託の着手金
            </div>
          </div>
          <button className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: "var(--teal)" }}>
            リンクを承認
          </button>
        </div>
      </Card>
      <div>
        <SectionHead title="直近30日" />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "var(--ink-mute)" }} className="text-left text-xs">
                <th className="px-4 py-3 font-medium">日付</th>
                <th className="px-4 py-3 font-medium">相手先</th>
                <th className="px-4 py-3 text-right font-medium">金額</th>
                <th className="px-4 py-3 text-right font-medium">状態</th>
              </tr>
            </thead>
            <tbody>
              {PAY_HISTORY.map((p) => (
                <tr key={p.date + p.party} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-3 tabular" style={{ color: "var(--ink-mute)" }}>
                    {p.date}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.party}</td>
                  <td className="px-4 py-3 text-right tabular">{yen(p.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Pill tone={p.tone}>{p.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function AutomationTab() {
  return (
    <div>
      <SectionHead title="自動化" sub="AI社員が自走で回すすべて" />
      <Card>
        {AUTOMATIONS.map((a, i) => (
          <div key={a.name} className="flex items-center gap-4 px-4 py-4" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
            <span className="text-lg">{a.on ? "▶︎" : "⏸"}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{a.name}</div>
              <div className="text-xs" style={{ color: "var(--ink-mute)" }}>
                最終実行：{a.last}
              </div>
            </div>
            <Pill tone={a.on ? "green" : "gray"}>{a.on ? "稼働中" : "停止"}</Pill>
          </div>
        ))}
      </Card>
    </div>
  );
}

function TeamTab({ aiName }: { aiName: string }) {
  return (
    <div>
      <SectionHead title="チーム" sub="人間とAI社員が並んで働く" />
      <div className="grid gap-3 sm:grid-cols-2">
        {TEAM.map((m) => (
          <Card key={m.name} className="flex items-center gap-4 p-5">
            <Avatar init={m.init} tone={m.tone} size={48} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{m.kind === "AI" ? aiName : m.name}</span>
                <Pill tone={m.kind === "AI" ? "teal" : "blue"}>{m.kind}</Pill>
              </div>
              <div className="text-sm" style={{ color: "var(--ink-mute)" }}>
                {m.role}
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--ink-soft)" }}>
                {m.status}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div>
      <SectionHead title="レポート" sub="成果物はここに。会話はLINEに。" />
      <Card>
        {REPORTS.map((r, i) => (
          <div key={r.title} className="flex items-center gap-4 px-4 py-4" style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
            <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "var(--surface-2)" }}>
              📄
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs" style={{ color: "var(--ink-mute)" }}>
                {r.type} ・ {r.time}
              </div>
            </div>
            <button className="text-sm font-medium" style={{ color: "var(--teal-ink)" }}>
              開く
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SettingsTab({ aiName, overall, onReset }: { aiName: string; overall: number; onReset: () => void }) {
  return (
    <div className="max-w-2xl space-y-6">
      <SectionHead title="設定" sub="あなたのAI社員、あなたのルール。" />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar init={aiName.slice(0, 1) || "ハ"} size={56} />
          <div>
            <div className="text-lg font-bold">{aiName}</div>
            <div className="text-sm" style={{ color: "var(--teal-ink)" }}>
              総合理解度 {overall}%
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold">接続中のソース</div>
        <div className="grid grid-cols-2 gap-2">
          {SOURCES.map((s) => (
            <div key={s.name} className="flex items-center gap-2 text-sm">
              <span
                className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold"
                style={{ color: s.on ? "#fff" : "var(--ink-mute)", background: s.on ? "var(--teal)" : "var(--line)" }}
              >
                {s.on ? "✓" : "+"}
              </span>
              <span style={{ color: s.on ? "var(--ink)" : "var(--ink-mute)" }}>{s.name}</span>
            </div>
          ))}
        </div>
      </Card>
      <button onClick={onReset} className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--line-strong)", color: "var(--ink-soft)" }}>
        オンボーディングをやり直す
      </button>
    </div>
  );
}

/* ============================================================
   Root
   ============================================================ */

export default function Page() {
  const [stage, setStage] = useState<"onboarding" | "app">("onboarding");
  const [aiName, setAiName] = useState("ハル");

  return stage === "onboarding" ? (
    <Onboarding aiName={aiName} setAiName={setAiName} onDone={() => setStage("app")} />
  ) : (
    <Dashboard aiName={aiName} onReset={() => setStage("onboarding")} />
  );
}
