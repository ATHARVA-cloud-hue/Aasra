-- ============================================================================
--  AASRA — complete database setup
-- ============================================================================
--  WHAT THIS DOES
--  Creates the five tables the app needs, links them together, and switches
--  on Row Level Security so one family can never see another family's case.
--
--  HOW TO RUN IT
--  Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--  (The full step-by-step is in the chat / README.)
--
--  SAFE TO RUN TWICE
--  Everything below uses "if not exists" or "drop ... if exists" first, so
--  running this file again will not delete your data or throw errors.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. CASES — one row per deceased person. The heart of the app.
--     Every answer from the intake wizard lands in this row.
-- ----------------------------------------------------------------------------
create table if not exists public.cases (
  id            uuid primary key default gen_random_uuid(),

  -- Who owns this case. Filled in automatically from the signed-in user,
  -- and used by every security policy further down.
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,

  -- The person who died, and the intake answers about them.
  deceased_name     text,
  relationship      text,   -- "they were my ..." e.g. father
  date_of_death     date,
  place_of_death    text,
  religion          text,   -- decides which succession law applies

  has_will          boolean,  -- true = there is a will, false = no will,
                              -- null = we have not asked / they are unsure
  assets_abroad     boolean,  -- anything owned outside India
  owned_business    boolean,  -- a shop, firm or company in their name

  -- The family, as typed in the wizard. Free text on purpose: the tidy,
  -- per-person version lives in the "heirs" table below.
  spouse_name       text,
  children_names    text,

  -- "Any banks, insurers or employers you know of" — the starting point
  -- for the hidden-asset search.
  known_assets_note text,

  -- How far through the journey they are, so we can bring them back.
  last_step     text,
  status        text not null default 'in_progress'
                check (status in ('in_progress', 'submitted', 'closed')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
--  1b. The optional answers behind the recovery estimate.
--
--      Added after the cases table shipped, so they go on as separate
--      "add column if not exists" statements rather than being edited
--      into the create above. That keeps this whole file safe to run
--      again on a database that already has data in it.
--
--      Every one is nullable. The estimate works without them and
--      simply shows wider ranges, so nothing here is required.
-- ----------------------------------------------------------------------------
alter table public.cases
  add column if not exists employed_at_death boolean;      -- in a job at death?

alter table public.cases
  add column if not exists years_of_service integer;       -- whole years worked

alter table public.cases
  add column if not exists last_monthly_salary integer;    -- rupees per month

alter table public.cases
  add column if not exists property_state text;            -- which state's land portal


-- ----------------------------------------------------------------------------
--  2. ASSETS — a bank account, a policy, a plot of land. Many per case.
-- ----------------------------------------------------------------------------
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),

  -- on delete cascade: remove a case and its assets go with it.
  case_id     uuid not null references public.cases (id) on delete cascade,

  asset_type  text,    -- "Savings account", "Life insurance", "Provident fund"
  details     text,    -- anything they know: policy number, branch, amount
  institution text,    -- "State Bank of India", "LIC", "EPFO"

  -- Where this asset came from, so the UI can say "we found this for you".
  source      text not null default 'family'
              check (source in ('family', 'discovered')),

  created_at  timestamptz not null default now()
);

create index if not exists assets_case_id_idx on public.assets (case_id);


-- ----------------------------------------------------------------------------
--  3. HEIRS — who inherits. One row per person.
-- ----------------------------------------------------------------------------
create table if not exists public.heirs (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases (id) on delete cascade,

  full_name       text,
  relationship    text,   -- "Wife", "Son", "Daughter", "Mother"
  share_note      text,   -- "One equal share", in plain words

  -- false until a qualified lawyer has looked at it. Nothing legal is
  -- ever filed on the strength of an unverified row.
  lawyer_verified boolean not null default false,

  created_at      timestamptz not null default now()
);

create index if not exists heirs_case_id_idx on public.heirs (case_id);


-- ----------------------------------------------------------------------------
--  4. DOCUMENTS — one row per photo or PDF a family uploads.
--     The file itself lives in Supabase Storage; this row remembers where.
-- ----------------------------------------------------------------------------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases (id) on delete cascade,

  doc_type      text,   -- "Death certificate", "Bank passbook", ...
  original_name text,   -- the file name as it was on their phone
  storage_path  text,   -- where the file sits in Supabase Storage

  -- Set once Claude has read the document and pulled the details out.
  extracted     jsonb,
  status        text not null default 'uploaded'
                check (status in ('uploaded', 'read', 'failed')),

  created_at    timestamptz not null default now()
);

create index if not exists documents_case_id_idx on public.documents (case_id);


-- ----------------------------------------------------------------------------
--  5. TASKS — the checklist behind the "Your case" tracker.
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,

  title       text,   -- "Savings account"
  detail      text,   -- "Needs your signature"
  institution text,   -- "State Bank of India"

  -- The three states the tracker shows.
  status      text not null default 'waiting'
              check (status in ('done', 'waiting', 'this-week')),

  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists tasks_case_id_idx on public.tasks (case_id);


-- ----------------------------------------------------------------------------
--  6. LAWYERS — the panel behind the "Talk to a lawyer" page.
--     Unlike every other table here, this one is PUBLIC to read: a family
--     in the first hour after a death must be able to see who they can
--     ask without creating an account first. There is nothing private in
--     a row — it is the same information a lawyer puts on a nameplate.
-- ----------------------------------------------------------------------------
create table if not exists public.lawyers (
  id          uuid primary key default gen_random_uuid(),

  name        text not null,
  photo_url   text,     -- optional; the cards fall back to initials

  -- Free text rather than a check constraint, so the panel can grow
  -- without a migration. The filter buttons in the app use these five:
  --   Hindu succession, Muslim personal law, Christian/Parsi succession,
  --   Property disputes, General
  specialty   text,

  city        text,
  languages   text[],   -- e.g. '{Marathi,Hindi,English}'

  years_experience       integer,

  -- Whole rupees, never paise. Null means "ask us", and the app shows
  -- "On request" rather than a misleading ₹0.
  consultation_price_inr integer,
  full_case_price_inr    integer,

  bio         text,

  -- Take somebody off the panel without deleting their history.
  is_active   boolean not null default true,

  created_at  timestamptz not null default now()
);

create index if not exists lawyers_specialty_idx on public.lawyers (specialty);


-- ----------------------------------------------------------------------------
--  7. CONSULTATIONS — "Request a consultation" on a lawyer's card.
--     One row per ask. Private to the family that asked.
-- ----------------------------------------------------------------------------
create table if not exists public.consultations (
  id          uuid primary key default gen_random_uuid(),

  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,

  -- on delete set null: a lawyer leaving the panel must not erase the
  -- fact that a family asked for help.
  lawyer_id   uuid references public.lawyers (id) on delete set null,

  -- The name as it was shown to the family, kept as plain text so the
  -- request still reads correctly after any change to the panel.
  lawyer_name text,

  -- Optional. Set when the family already has a case open.
  case_id     uuid references public.cases (id) on delete set null,

  kind        text not null default 'consultation'
              check (kind in ('consultation', 'full_case')),

  status      text not null default 'requested'
              check (status in ('requested', 'contacted', 'scheduled', 'closed')),

  note        text,

  created_at  timestamptz not null default now()
);

create index if not exists consultations_user_id_idx on public.consultations (user_id);


-- ----------------------------------------------------------------------------
--  7b. PAYMENT on a consultation.
--
--      Added after the consultations table shipped, so these go on as
--      separate "add column if not exists" statements. Safe to run again
--      on a database that already has rows in it.
--
--      amount_inr is a SNAPSHOT of the fee at the moment the family
--      asked, in whole rupees. It is stored rather than read back from
--      the lawyers table on demand, because a lawyer raising their fee
--      next year must not change what a family was quoted and charged.
-- ----------------------------------------------------------------------------
alter table public.consultations
  add column if not exists payment_status text not null default 'unpaid';

alter table public.consultations
  add column if not exists amount_inr integer;

-- Razorpay's own identifiers, kept for reconciliation against their
-- dashboard. Neither is a secret.
alter table public.consultations
  add column if not exists razorpay_order_id text;

alter table public.consultations
  add column if not exists razorpay_payment_id text;

alter table public.consultations
  add column if not exists paid_at timestamptz;

-- The three states a payment can be in. Dropped and re-added rather
-- than created once, so re-running this file updates the rule instead
-- of failing on a constraint that already exists.
alter table public.consultations
  drop constraint if exists consultations_payment_status_check;

alter table public.consultations
  add constraint consultations_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'failed'));

-- "confirmed" is new: it is what a consultation becomes once the fee has
-- actually been paid and verified. The original list did not have it.
alter table public.consultations
  drop constraint if exists consultations_status_check;

alter table public.consultations
  add constraint consultations_status_check
  check (status in ('requested', 'confirmed', 'contacted', 'scheduled', 'closed'));


-- ----------------------------------------------------------------------------
--  8. PROFILES — one row per account, kept in step after sign-up and log-in.
--     auth.users already holds the email; this is the copy our own tables
--     are allowed to join against, plus a name to address someone by.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  -- The same id as the account, not a new one. on delete cascade means
  -- deleting the account takes the profile with it.
  id         uuid primary key
             references auth.users (id) on delete cascade,

  email      text,
  full_name  text,   -- optional; nobody is made to give a name

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
--  9. Keep cases.updated_at honest, automatically.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- The same trigger, reused: profiles.updated_at moves every time a
-- log-in refreshes the row.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ============================================================================
--  10. ROW LEVEL SECURITY
-- ============================================================================
--  Until RLS is switched on, anyone holding the public key could read every
--  row in the database. With it on, Postgres filters every single query by
--  "is this yours?" — so a family can only ever reach their own case.
--
--  cases         : mine when cases.user_id is me.
--  consultations : mine when consultations.user_id is me.
--  profiles      : mine when profiles.id is me.
--  lawyers       : readable by everyone, writable by nobody from the app.
--  everything else : mine when it hangs off a case that is mine.
--
--  (auth.uid() is wrapped in "select" so Postgres works it out once per
--  query instead of once per row — much faster on long lists.)
-- ============================================================================

alter table public.cases         enable row level security;
alter table public.assets        enable row level security;
alter table public.heirs         enable row level security;
alter table public.documents     enable row level security;
alter table public.tasks         enable row level security;
alter table public.lawyers       enable row level security;
alter table public.consultations enable row level security;
alter table public.profiles      enable row level security;


-- ---- cases ----------------------------------------------------------------
drop policy if exists "read own cases"   on public.cases;
drop policy if exists "create own cases" on public.cases;
drop policy if exists "update own cases" on public.cases;
drop policy if exists "delete own cases" on public.cases;

create policy "read own cases" on public.cases
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "create own cases" on public.cases
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own cases" on public.cases
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));   -- cannot hand a case to someone else

create policy "delete own cases" on public.cases
  for delete to authenticated
  using (user_id = (select auth.uid()));


-- ---- the four linked tables ------------------------------------------------
--  Same rule four times: "the case this row points at must be mine".
--  Written out in full rather than cleverly, so it is easy to read later.

-- assets
drop policy if exists "read own assets"   on public.assets;
drop policy if exists "write own assets"  on public.assets;
drop policy if exists "update own assets" on public.assets;
drop policy if exists "delete own assets" on public.assets;

create policy "read own assets" on public.assets
  for select to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = assets.case_id and c.user_id = (select auth.uid())));

create policy "write own assets" on public.assets
  for insert to authenticated
  with check (exists (select 1 from public.cases c
                      where c.id = assets.case_id and c.user_id = (select auth.uid())));

create policy "update own assets" on public.assets
  for update to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = assets.case_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c
                      where c.id = assets.case_id and c.user_id = (select auth.uid())));

create policy "delete own assets" on public.assets
  for delete to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = assets.case_id and c.user_id = (select auth.uid())));

-- heirs
drop policy if exists "read own heirs"   on public.heirs;
drop policy if exists "write own heirs"  on public.heirs;
drop policy if exists "update own heirs" on public.heirs;
drop policy if exists "delete own heirs" on public.heirs;

create policy "read own heirs" on public.heirs
  for select to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = heirs.case_id and c.user_id = (select auth.uid())));

create policy "write own heirs" on public.heirs
  for insert to authenticated
  with check (exists (select 1 from public.cases c
                      where c.id = heirs.case_id and c.user_id = (select auth.uid())));

create policy "update own heirs" on public.heirs
  for update to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = heirs.case_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c
                      where c.id = heirs.case_id and c.user_id = (select auth.uid())));

create policy "delete own heirs" on public.heirs
  for delete to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = heirs.case_id and c.user_id = (select auth.uid())));

-- documents
drop policy if exists "read own documents"   on public.documents;
drop policy if exists "write own documents"  on public.documents;
drop policy if exists "update own documents" on public.documents;
drop policy if exists "delete own documents" on public.documents;

create policy "read own documents" on public.documents
  for select to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = documents.case_id and c.user_id = (select auth.uid())));

create policy "write own documents" on public.documents
  for insert to authenticated
  with check (exists (select 1 from public.cases c
                      where c.id = documents.case_id and c.user_id = (select auth.uid())));

create policy "update own documents" on public.documents
  for update to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = documents.case_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c
                      where c.id = documents.case_id and c.user_id = (select auth.uid())));

create policy "delete own documents" on public.documents
  for delete to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = documents.case_id and c.user_id = (select auth.uid())));

-- tasks
drop policy if exists "read own tasks"   on public.tasks;
drop policy if exists "write own tasks"  on public.tasks;
drop policy if exists "update own tasks" on public.tasks;
drop policy if exists "delete own tasks" on public.tasks;

create policy "read own tasks" on public.tasks
  for select to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = tasks.case_id and c.user_id = (select auth.uid())));

create policy "write own tasks" on public.tasks
  for insert to authenticated
  with check (exists (select 1 from public.cases c
                      where c.id = tasks.case_id and c.user_id = (select auth.uid())));

create policy "update own tasks" on public.tasks
  for update to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = tasks.case_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.cases c
                      where c.id = tasks.case_id and c.user_id = (select auth.uid())));

create policy "delete own tasks" on public.tasks
  for delete to authenticated
  using (exists (select 1 from public.cases c
                 where c.id = tasks.case_id and c.user_id = (select auth.uid())));



-- ---- lawyers ---------------------------------------------------------------
--  The one deliberately public table. "anon, authenticated" means a family
--  who has not logged in can still see the panel, which is the point: the
--  page has to work in the first hour, before anyone makes an account.
--
--  There is no insert, update or delete policy, so nothing holding the
--  public key can change the panel. Lawyers are added in the Supabase
--  Table Editor, or by something using the service-role key on a server.

drop policy if exists "anyone can read active lawyers" on public.lawyers;

create policy "anyone can read active lawyers" on public.lawyers
  for select to anon, authenticated
  using (is_active);


-- ---- consultations ---------------------------------------------------------
--  Same shape as cases: mine when the row is mine. A family can see and
--  make their own requests; the status column is moved along by our side,
--  not by the app, so there is no update policy.

drop policy if exists "read own consultations"   on public.consultations;
drop policy if exists "create own consultations" on public.consultations;

create policy "read own consultations" on public.consultations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "create own consultations" on public.consultations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

/*
  Updating a consultation.

  Needed because the payment verification route writes payment_status
  back onto the row. The route forwards the signed-in family's own
  access token, so this policy is what lets that write land.

  WORTH KNOWING: this policy means a determined person could call
  Supabase directly and set payment_status on their OWN consultation
  without paying. The amount is small and the row is theirs, so the
  blast radius is one unpaid consultation request, which a human sees
  before any lawyer is booked.

  To close it properly, set SUPABASE_SERVICE_ROLE_KEY. The route then
  writes with that key instead and this policy can be dropped, leaving
  no client-reachable way to mark anything paid.
*/
drop policy if exists "update own consultations" on public.consultations;

create policy "update own consultations" on public.consultations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ---- profiles --------------------------------------------------------------
--  The app upserts this row after every sign-up and log-in, so it needs
--  insert and update as well as select. All three check the same thing:
--  the row's id must be your own account. Nobody can write a profile for
--  somebody else, or read one.
--
--  No delete policy: a profile goes when the account goes, through the
--  "on delete cascade" on the id column.

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "create own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;

create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "create own profile" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));


-- ============================================================================
--  Done. You should see "Success. No rows returned".
--  Now open Table Editor and you will find: assets, cases, consultations,
--  documents, heirs, lawyers, profiles, tasks — all empty, each with a
--  shield icon meaning RLS is on.
--
--  One last step for the lawyers table: it starts empty, and an empty
--  table makes the app fall back to its five sample lawyers. Add real
--  rows in Table Editor -> lawyers -> Insert row when you have them.
-- ============================================================================
