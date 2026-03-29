-- ─── Migration 003: clients + recurring_recons + client_id on reconciliations ─

-- ── clients ──────────────────────────────────────────────────────────────────

create table if not exists clients (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organisations(id) on delete cascade,
  name           text not null,
  gstin          text,
  contact_person text,
  email          text,
  phone          text,
  company        text,
  industry       text,
  notes          text,
  status         text not null default 'active' check (status in ('active','prospect','inactive')),
  color          text not null default '#0d9488',
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists clients_org_id_idx on clients(org_id);
create index if not exists clients_status_idx  on clients(org_id, status);

-- RLS
alter table clients enable row level security;

create policy "org members can view clients"
  on clients for select
  using (
    exists (
      select 1 from org_members
      where org_members.org_id   = clients.org_id
        and org_members.user_id  = auth.uid()
        and org_members.is_active = true
    )
  );

create policy "owner/admin/reviewer can manage clients"
  on clients for all
  using (
    exists (
      select 1 from org_members
      where org_members.org_id   = clients.org_id
        and org_members.user_id  = auth.uid()
        and org_members.is_active = true
        and org_members.role     in ('owner','admin','reviewer')
    )
  );

-- ── Add client_id to reconciliations ─────────────────────────────────────────

alter table reconciliations
  add column if not exists client_id uuid references clients(id) on delete set null;

create index if not exists recon_client_id_idx on reconciliations(org_id, client_id);

-- ── recurring_recons ─────────────────────────────────────────────────────────

create table if not exists recurring_recons (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organisations(id) on delete cascade,
  client_id      uuid references clients(id) on delete set null,
  name           text not null,
  frequency      text not null check (frequency in ('monthly','quarterly')),
  status         text not null default 'active' check (status in ('active','paused','cancelled')),
  day_of_month   int  not null default 1 check (day_of_month between 1 and 28),
  assigned_to    uuid references users(id) on delete set null,
  auto_create    boolean not null default false,
  remind_days    int not null default 3,
  next_due_date  date,
  last_created_at date,
  created_by     uuid references users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists rr_org_idx    on recurring_recons(org_id);
create index if not exists rr_status_idx on recurring_recons(org_id, status);
create index if not exists rr_due_idx    on recurring_recons(org_id, next_due_date);

-- RLS
alter table recurring_recons enable row level security;

create policy "org members can view recurring recons"
  on recurring_recons for select
  using (
    exists (
      select 1 from org_members
      where org_members.org_id   = recurring_recons.org_id
        and org_members.user_id  = auth.uid()
        and org_members.is_active = true
    )
  );

create policy "owner/admin/reviewer can manage recurring recons"
  on recurring_recons for all
  using (
    exists (
      select 1 from org_members
      where org_members.org_id   = recurring_recons.org_id
        and org_members.user_id  = auth.uid()
        and org_members.is_active = true
        and org_members.role     in ('owner','admin','reviewer')
    )
  );

-- ── Update org_member roles to new role model ─────────────────────────────────
-- Old: 'owner' | 'admin' | 'member'
-- New: 'owner' | 'admin' | 'reviewer' | 'analyst' | 'viewer'
-- Existing 'member' rows become 'analyst':

update org_members set role = 'analyst' where role = 'member';

-- Drop old constraint (if any) and add new one:
alter table org_members
  drop constraint if exists org_members_role_check;

alter table org_members
  add constraint org_members_role_check
  check (role in ('owner','admin','reviewer','analyst','viewer'));
