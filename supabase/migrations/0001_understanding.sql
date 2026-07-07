-- AtoA backend schema v1 — the understanding pipeline.
-- Raw files never reach this database; only derived digests (see docs/ARCHITECTURE.md).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- companies

create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.company_members (
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  created_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- ------------------------------------------------------------------ sources
-- Every place the AI employee learns from. Local machines push via the CLI;
-- cloud SaaS sources hold OAuth state in config (tokens live in Vault later).

create table public.sources (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  kind           text not null check (kind in
                   ('local_cli', 'gmail', 'slack', 'notion', 'github', 'calendar', 'line', 'stripe')),
  label          text,
  status         text not null default 'linked' check (status in ('linked', 'syncing', 'error', 'revoked')),
  config         jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now()
);

create index sources_company_idx on public.sources (company_id);

-- ------------------------------------------------------------ ingest tokens
-- Per-company bearer tokens for `atoa push`. Only the SHA-256 hash is stored.

create table public.ingest_tokens (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  token_hash  text not null unique,
  label       text,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index ingest_tokens_company_idx on public.ingest_tokens (company_id);

-- --------------------------------------------------- understanding snapshots
-- Append-only. The dashboard reads the latest row; history shows growth over time.

create table public.understanding_snapshots (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  source_id    uuid references public.sources (id) on delete set null,
  overall      integer not null check (overall between 0 and 100),
  digest       jsonb not null,
  generated_at timestamptz not null,
  created_at   timestamptz not null default now()
);

create index snapshots_latest_idx
  on public.understanding_snapshots (company_id, generated_at desc);

-- ---------------------------------------------------------------------- RLS
-- Members read their company's data. Writes go through the Next.js API with the
-- service role after ingest-token verification, so no insert policies here.

alter table public.companies              enable row level security;
alter table public.company_members        enable row level security;
alter table public.sources                enable row level security;
alter table public.ingest_tokens          enable row level security;
alter table public.understanding_snapshots enable row level security;

create or replace function public.is_company_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid and m.user_id = auth.uid()
  );
$$;

create policy "members read company"
  on public.companies for select using (public.is_company_member(id));

create policy "members read membership"
  on public.company_members for select using (user_id = auth.uid() or public.is_company_member(company_id));

create policy "members read sources"
  on public.sources for select using (public.is_company_member(company_id));

create policy "members read snapshots"
  on public.understanding_snapshots for select using (public.is_company_member(company_id));

-- ingest_tokens: no select policy — hashes never leave the server.

create policy "owner creates company"
  on public.companies for insert with check (owner_id = auth.uid());
