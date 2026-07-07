# AtoA アーキテクチャ — 「自分を理解させる」仕組み

> AtoA = 会社を誰よりも理解するAI社員。
> この文書は「理解エンジン」の全体設計。デモ（index.html）は温存し、本番は additive に構築する。

## 全体像

```
┌─ あなたのPC（ローカル）────────────┐        ┌─ クラウド ──────────────────────────┐
│                                     │        │                                      │
│  atoa scan   ファイル/コード/git を │        │  Next.js (apps/web, Vercel)          │
│              走査 → 理解ダイジェスト │        │   ├ /            ランディング         │
│              (.atoa/understanding.json)      │   ├ /report      理解レポート         │
│                                     │ digest │   └ /api/understanding  ingest API   │
│  atoa push   ダイジェストだけ送信 ──┼───────▶│         │                            │
│              (Bearer ingest token)  │  のみ  │         ▼                            │
│                                     │        │  Supabase (Postgres + Auth + RLS)    │
│  atoa serve  ローカルMCPサーバ ◀───┼─ 質問 ─│         ▲                            │
│              生ファイルはここから   │        │         │ tool use / MCP host        │
│              一歩も出ない           │        │  Claude API（AI社員の頭脳）           │
└─────────────────────────────────────┘        └──────────────────────────────────────┘
```

## 設計原則

1. **生ファイルはPCから出ない。** クラウドに置くのは派生ダイジェスト（スコア・統計・要約）だけ。
2. **MCPが共通の口。** ソースを増やす＝MCPを1個増やす。AtoA本体はMCPホスト（Claude Codeと同じ構造）。
3. **理解は3層で深まる。**
   - 層1: `atoa scan` — ローカルの構造的理解（言語・プロジェクト・git習慣）→ 即日動く、認証不要
   - 層2: クラウドSaaS（Gmail/Slack/Notion/GitHub/Calendar/LINE/Stripe）— OAuthでMCP接続、顧客・コミュニケーションの理解
   - 層3: 会話フィードバック — AI社員とのやりとり自体が理解を更新する（訂正・好み・判断基準）
4. **append-only スナップショット。** 理解は上書きせず積む。「先週より+12%理解した」が UI の核になる。

## データモデル（supabase/migrations/0001_understanding.sql）

| テーブル | 役割 |
| --- | --- |
| `companies` / `company_members` | テナントとメンバー（RLSの境界） |
| `sources` | 学習元。`local_cli` と OAuth系SaaS。状態と最終同期時刻 |
| `ingest_tokens` | `atoa push` 用トークン。**SHA-256ハッシュのみ保存** |
| `understanding_snapshots` | 理解ダイジェスト本体（jsonb）。append-only、最新を表示 |

- 読み取り: Supabase Auth のセッションで RLS（メンバーのみ自社データ）。
- 書き込み（ingest）: Next.js API が ingest token を検証 → service role で insert。クライアントから直接 insert はさせない。

## 同期フロー

```
atoa scan ~/company        # ローカルで走査、.atoa/understanding.json を生成
atoa push --to https://ai-employee-seven.vercel.app --token <ingest token>
                           # ダイジェストのみPOST → understanding_snapshots に追記
# ダッシュボード(/report)は最新スナップショットを表示
```

現在の実装は環境変数でストアを切替（コード変更なしで昇格）:

- dev: `FileStore`（`.data/*.json`）
- prod: `SupabaseStore`（`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` を設定すると自動で切替）
- ingest保護: `ATOA_INGEST_TOKEN`（v1は共有シークレット。マルチテナント化で `ingest_tokens` テーブル照合に差し替え）

## 深い理解（層2・層3）の設計

### クラウドソース（層2）
- 各SaaSはOAuth接続し、**MCPサーバとして**AtoAに生える。`sources` に1行追加。
- 同期ワーカー（Vercel Cron → API route）が定期的に「ダイジェスト化」だけを行う。メール本文を保存せず、「顧客Aと今月14通、返信中央値2.1h」のような派生統計に落とす。

### ローカルへの質問（`atoa serve`）
- クラウドのAI社員が「◯◯の実装どうなってる？」を必要とした時だけ、ローカルMCP（get_understanding / list_files / read_file / search_code）へ問い合わせる。
- 接続はローカル→クラウドの outbound WebSocket（インバウンド穴あけ無し）。回答に使った生テキストは**セッション限りで破棄**、保存はしない。

### ナラティブ・プロフィール（層3）
- Claude API がスナップショット履歴＋会話ログから「この会社・この人の取扱説明書」を生成し、`understanding_snapshots` に `kind: narrative` として追記（次のマイグレーションで `kind` 列を追加）。
- AI社員の全タスク実行時、このプロフィールをシステムプロンプトに注入する。**これが「自分を理解しているAI社員」の実体。**

## ロードマップ

1. ✅ `atoa scan` / `atoa serve`（ローカル理解エンジン）
2. ✅ `atoa push` + ingest API + ダッシュボード（file store）
3. ⬜ Supabase 適用（migration 0001）+ Vercel 環境変数設定 → 本番URLで動く
4. ⬜ Supabase Auth（magic link）+ 企業作成オンボーディング + per-company ingest token
5. ⬜ クラウドソース第1号（GitHub か Gmail）を OAuth + Cron ダイジェスト化
6. ⬜ Give Task チャットを Claude API（tool use + ナラティブ注入）に接続
7. ⬜ `atoa serve` ⇄ クラウドの outbound トンネル（深掘り質問）
