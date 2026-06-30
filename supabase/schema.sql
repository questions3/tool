-- ============================================================
-- Convvy — схема контента + RLS + админ-доступ
-- Выполнить один раз в Supabase → SQL Editor.
-- Использует gen_random_uuid() (pgcrypto, включён в Supabase по умолчанию).
-- ============================================================

-- 0. Утилита: авто-обновление updated_at -------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- 1. ЯЗЫКИ («категории»)
-- ============================================================
create table if not exists public.languages (
  code        text primary key,                  -- 'ru','pl','de','es','en'
  name        text not null,                      -- 'Русский', 'Polski', ...
  is_enabled  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_languages_touch on public.languages;
create trigger trg_languages_touch before update on public.languages
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 2. ВОЗРАЖЕНИЯ (Шаг 1)
-- ============================================================
create table if not exists public.objections (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,               -- стабильный ключ: 'no_funds'
  label       jsonb not null default '{}'::jsonb,  -- {"ru":"Нет денег","pl":"Brak środków"}
  hint        jsonb not null default '{}'::jsonb,
  is_enabled  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_objections_touch on public.objections;
create trigger trg_objections_touch before update on public.objections
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 3. ЭТАПЫ РАЗГОВОРА (Шаг 2)
-- ============================================================
create table if not exists public.stages (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,               -- 'intro','before_lk','after_lk'
  label       jsonb not null default '{}'::jsonb,
  hint        jsonb not null default '{}'::jsonb,
  is_enabled  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_stages_touch on public.stages;
create trigger trg_stages_touch before update on public.stages
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 4. СКРИПТЫ (Шаг 3) — пара (возражение × этап)
-- ============================================================
create table if not exists public.rebuttals (
  id            uuid primary key default gen_random_uuid(),
  objection_id  uuid not null references public.objections(id) on delete cascade,
  stage_id      uuid not null references public.stages(id)     on delete cascade,
  answer        jsonb not null default '{}'::jsonb,            -- базовый скрипт по языкам
  is_draft      boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (objection_id, stage_id)
);
drop trigger if exists trg_rebuttals_touch on public.rebuttals;
create trigger trg_rebuttals_touch before update on public.rebuttals
  for each row execute function public.touch_updated_at();

create index if not exists idx_rebuttals_objection on public.rebuttals(objection_id);
create index if not exists idx_rebuttals_stage     on public.rebuttals(stage_id);

-- ============================================================
-- 5. ВЕТКИ what-if
-- ============================================================
create table if not exists public.branches (
  id           uuid primary key default gen_random_uuid(),
  rebuttal_id  uuid not null references public.rebuttals(id) on delete cascade,
  label        jsonb not null default '{}'::jsonb,
  condition    jsonb not null default '{}'::jsonb,
  response     jsonb not null default '{}'::jsonb,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_branches_touch on public.branches;
create trigger trg_branches_touch before update on public.branches
  for each row execute function public.touch_updated_at();

create index if not exists idx_branches_rebuttal on public.branches(rebuttal_id);

-- ============================================================
-- 6. АДМИНЫ + helper is_admin()
-- ============================================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER, чтобы политики не зависели от RLS самой таблицы admins
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- is_admin() нужен только роли authenticated (в RLS-политиках записи).
-- Закрываем доступ анонимам через /rest/v1/rpc (security advisor 0028).
revoke execute on function public.is_admin() from anon, public;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- 6b. БЕЛЫЙ СПИСОК EMAIL АГЕНТОВ (вход по OTP-коду на /)
-- ============================================================
create table if not exists public.agent_emails (
  email      text primary key,                   -- email агента (логин)
  note       text,                               -- имя/заметка
  created_at timestamptz not null default now()
);

alter table public.agent_emails enable row level security;

-- Управление списком — только админам.
drop policy if exists "admin manage agent_emails" on public.agent_emails;
create policy "admin manage agent_emails" on public.agent_emails
  for all using (public.is_admin()) with check (public.is_admin());

-- Проверка «разрешён ли email» — доступна анонимам ДО входа,
-- но не раскрывает сам список (SECURITY DEFINER, возвращает только boolean).
create or replace function public.is_agent_allowed(p_email text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agent_emails a
    where lower(a.email) = lower(trim(p_email))
  );
$$;

revoke execute on function public.is_agent_allowed(text) from public;
grant execute on function public.is_agent_allowed(text) to anon, authenticated;

-- ============================================================
-- 6c. РАЗДЕЛЫ АГЕНТА: Презентации / Сервисы / Рынок (entries)
-- Одноступенчатые списки: элемент = заголовок + контент (локализованные).
-- ============================================================
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  section     text not null check (section in ('presentation','service','market')),
  title       jsonb not null default '{}'::jsonb,
  body        jsonb not null default '{}'::jsonb,
  is_enabled  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_entries_touch on public.entries;
create trigger trg_entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();
create index if not exists idx_entries_section on public.entries(section, sort_order);

alter table public.entries enable row level security;
drop policy if exists "public read entries" on public.entries;
create policy "public read entries" on public.entries for select using (true);
drop policy if exists "admin write entries" on public.entries;
create policy "admin write entries" on public.entries
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 7. RLS
-- ============================================================
alter table public.languages  enable row level security;
alter table public.objections enable row level security;
alter table public.stages     enable row level security;
alter table public.rebuttals  enable row level security;
alter table public.branches   enable row level security;
alter table public.admins     enable row level security;

-- Публичное чтение контента (anon + authenticated)
drop policy if exists "public read languages"  on public.languages;
drop policy if exists "public read objections" on public.objections;
drop policy if exists "public read stages"     on public.stages;
drop policy if exists "public read rebuttals"  on public.rebuttals;
drop policy if exists "public read branches"   on public.branches;
create policy "public read languages"  on public.languages  for select using (true);
create policy "public read objections" on public.objections for select using (true);
create policy "public read stages"     on public.stages     for select using (true);
create policy "public read rebuttals"  on public.rebuttals  for select using (true);
create policy "public read branches"   on public.branches   for select using (true);

-- Запись — только админам
drop policy if exists "admin write languages"  on public.languages;
drop policy if exists "admin write objections" on public.objections;
drop policy if exists "admin write stages"     on public.stages;
drop policy if exists "admin write rebuttals"  on public.rebuttals;
drop policy if exists "admin write branches"   on public.branches;
create policy "admin write languages"  on public.languages  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write objections" on public.objections for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write stages"     on public.stages     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write rebuttals"  on public.rebuttals  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write branches"   on public.branches   for all using (public.is_admin()) with check (public.is_admin());

-- admins: видит только сам админ; вставка/удаление — только админ
drop policy if exists "admin read self" on public.admins;
drop policy if exists "admin manage"    on public.admins;
create policy "admin read self" on public.admins for select using (public.is_admin() or user_id = auth.uid());
create policy "admin manage"    on public.admins for all    using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 8. НАЗНАЧИТЬ СЕБЯ АДМИНОМ
-- ============================================================
-- 1) Создать пользователя: Supabase → Authentication → Users → Add user (email+пароль)
-- 2) Раскомментировать и подставить свой email:
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'ВАШ_EMAIL'
-- on conflict (user_id) do nothing;
