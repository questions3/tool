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

-- is_admin() используется в RLS-политиках. Политики admin-write объявлены
-- FOR ALL, поэтому их условие is_admin() вычисляется и при SELECT — значит
-- EXECUTE нужен и anon, и authenticated, иначе чтение падает с permission
-- denied. Для анонима is_admin() всегда false (auth.uid() = null), утечки нет.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

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

-- Чтение контента разрешено только вошедшему агенту (email в agent_emails)
-- или админу. Используется в RLS-политиках чтения (раздел 7). Определена
-- здесь, т.к. на неё ссылаются политики таблицы entries (раздел 6c ниже).
-- Проверяем админа НАПРЯМУЮ по таблице (не через is_admin()), чтобы
-- функция не зависела от грантов на is_admin. SECURITY DEFINER читает
-- admins/agent_emails независимо от прав вызывающей роли.
create or replace function public.can_read_content()
returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from public.admins a where a.user_id = auth.uid())
    or exists (
      select 1 from public.agent_emails ae
      where lower(ae.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;
revoke execute on function public.can_read_content() from public;
grant  execute on function public.can_read_content() to anon, authenticated;

-- Индекс существующих скриптов: какие пары «возражение × этап» реально
-- заполнены и на каких языках. Нужен агентскому приложению, чтобы на шаге
-- «Этап» показывать только те карточки, где ответ есть (без этого ~2 клика
-- из 3 упирались в «скрипт не найден»). Возвращает только id и коды языков.
-- SECURITY INVOKER — RLS таблицы rebuttals работает как обычно (anon → 0 строк).
create or replace function public.rebuttal_index()
returns table (objection_id uuid, stage_id uuid, langs text[])
language sql stable security invoker set search_path = public as $$
  select r.objection_id,
         r.stage_id,
         (select array_agg(e.key)
            from jsonb_each_text(r.answer) e
           where trim(e.value) <> '') as langs
  from public.rebuttals r
  where not r.is_draft;
$$;
revoke execute on function public.rebuttal_index() from public;
grant  execute on function public.rebuttal_index() to anon, authenticated;

-- ============================================================
-- 6d. АНАЛИТИКА: просмотры скриптов и журнал входов
-- ============================================================
-- Обе таблицы пишет агентское приложение, читает только админ.
-- Записи не обновляются и не удаляются — журнал только дополняется.

create table if not exists public.script_views (
  id            uuid primary key default gen_random_uuid(),
  objection_id  uuid references public.objections(id) on delete cascade,
  stage_id      uuid references public.stages(id) on delete set null,
  lang          text not null,
  agent_email   text,
  viewed_at     timestamptz not null default now()
);
create index if not exists script_views_viewed_at_idx on public.script_views (viewed_at desc);
create index if not exists script_views_objection_idx on public.script_views (objection_id);

create table if not exists public.agent_logins (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  logged_at  timestamptz not null default now()
);
create index if not exists agent_logins_logged_at_idx on public.agent_logins (logged_at desc);

alter table public.script_views enable row level security;
alter table public.agent_logins enable row level security;

create policy "insert script_views" on public.script_views
  for insert to authenticated with check (public.can_read_content());
create policy "admin reads script_views" on public.script_views
  for select to authenticated using (public.is_admin());
create policy "insert agent_logins" on public.agent_logins
  for insert to authenticated with check (public.can_read_content());
create policy "admin reads agent_logins" on public.agent_logins
  for select to authenticated using (public.is_admin());

revoke all on public.script_views from anon;
revoke all on public.agent_logins from anon;
grant insert, select on public.script_views to authenticated;
grant insert, select on public.agent_logins to authenticated;

-- Топ возражений по открытиям: агрегат, без выгрузки сырых строк.
create or replace function public.usage_summary(p_days int default 30)
returns table (objection_id uuid, label jsonb, views bigint, last_viewed timestamptz)
language sql stable security invoker set search_path = public as $$
  select v.objection_id, o.label, count(*) as views, max(v.viewed_at) as last_viewed
  from public.script_views v
  join public.objections o on o.id = v.objection_id
  where v.viewed_at > now() - make_interval(days => greatest(p_days, 1))
  group by v.objection_id, o.label
  order by count(*) desc;
$$;
revoke execute on function public.usage_summary(int) from public;
grant execute on function public.usage_summary(int) to authenticated;

-- ------------------------------------------------------------
-- Исход разговора: чем закончился звонок после показанного скрипта.
-- Отметка добровольная — принуждение дало бы мусорные данные.
-- ------------------------------------------------------------
create table if not exists public.script_outcomes (
  id            uuid primary key default gen_random_uuid(),
  objection_id  uuid references public.objections(id) on delete cascade,
  stage_id      uuid references public.stages(id) on delete set null,
  lang          text not null,
  outcome       text not null check (outcome in ('success', 'callback', 'lost')),
  agent_email   text,
  created_at    timestamptz not null default now()
);
create index if not exists script_outcomes_created_at_idx on public.script_outcomes (created_at desc);
create index if not exists script_outcomes_objection_idx on public.script_outcomes (objection_id);

alter table public.script_outcomes enable row level security;

create policy "insert script_outcomes" on public.script_outcomes
  for insert to authenticated with check (public.can_read_content());
create policy "admin reads script_outcomes" on public.script_outcomes
  for select to authenticated using (public.is_admin());

-- Журналы только дополняются. Политик на update/delete нет, поэтому RLS их
-- закрывает, но TRUNCATE проверяется по табличным привилегиям и RLS обходит —
-- лишние права у authenticated снимаем явно, иначе журнал можно стереть.
revoke update, delete, truncate, references, trigger
  on public.script_views, public.agent_logins, public.script_outcomes
  from authenticated;
revoke all on public.script_outcomes from anon;
grant insert, select on public.script_outcomes to authenticated;

-- Сводка эффективности: открытий, отметок и разбивка исходов по возражениям.
-- Открытия и отметки считаются независимо, поэтому оба агрегата
-- подшиваются к списку возражений слева.
create or replace function public.outcome_summary(p_days int default 30)
returns table (
  objection_id uuid,
  label        jsonb,
  views        bigint,
  marked       bigint,
  success      bigint,
  callback     bigint,
  lost         bigint,
  last_marked  timestamptz
)
language sql stable security invoker set search_path = public as $$
  with period as (
    select now() - make_interval(days => greatest(p_days, 1)) as since
  ),
  v as (
    select sv.objection_id, count(*) as views
    from public.script_views sv, period p
    where sv.viewed_at > p.since
    group by sv.objection_id
  ),
  m as (
    select so.objection_id,
           count(*)                                       as marked,
           count(*) filter (where so.outcome = 'success')  as success,
           count(*) filter (where so.outcome = 'callback') as callback,
           count(*) filter (where so.outcome = 'lost')     as lost,
           max(so.created_at)                              as last_marked
    from public.script_outcomes so, period p
    where so.created_at > p.since
    group by so.objection_id
  )
  select o.id,
         o.label,
         coalesce(v.views, 0),
         coalesce(m.marked, 0),
         coalesce(m.success, 0),
         coalesce(m.callback, 0),
         coalesce(m.lost, 0),
         m.last_marked
  from public.objections o
  left join v on v.objection_id = o.id
  left join m on m.objection_id = o.id
  where coalesce(v.views, 0) > 0 or coalesce(m.marked, 0) > 0
  order by coalesce(m.marked, 0) desc, coalesce(v.views, 0) desc;
$$;
revoke execute on function public.outcome_summary(int) from public;
grant execute on function public.outcome_summary(int) to authenticated;

-- ============================================================
-- 6e. ТЕГИ, НОТАТКИ, ПОШУК, «ЩО НОВОГО», КОПІЯ МОВОЮ
-- ============================================================

-- Теги — поперечний розріз списку заперечень («ціна», «довіра»).
-- Одне заперечення може бути в кількох темах, тому зв'язок багато-до-багатьох.
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create table if not exists public.objection_tags (
  objection_id uuid not null references public.objections(id) on delete cascade,
  tag_id       uuid not null references public.tags(id) on delete cascade,
  primary key (objection_id, tag_id)
);
create index if not exists objection_tags_tag_idx on public.objection_tags (tag_id);

alter table public.tags enable row level security;
alter table public.objection_tags enable row level security;
create policy "read tags" on public.tags for select using (public.can_read_content());
create policy "admin writes tags" on public.tags
  for all using (public.is_admin()) with check (public.is_admin());
create policy "read objection_tags" on public.objection_tags
  for select using (public.can_read_content());
create policy "admin writes objection_tags" on public.objection_tags
  for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.tags, public.objection_tags from anon;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.objection_tags to authenticated;

-- Особисті нотатки оператора. Ключ — email, бо за ним працює білий список.
-- Якщо оператора прибрали, нотатки лишаються й доступні адміну: мовчки
-- видаляти чужу роботу не можна, а сам оператор доступ уже втратив.
create table if not exists public.agent_notes (
  id           uuid primary key default gen_random_uuid(),
  agent_email  text not null,
  objection_id uuid not null references public.objections(id) on delete cascade,
  stage_id     uuid not null references public.stages(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (agent_email, objection_id, stage_id)
);
create index if not exists agent_notes_email_idx on public.agent_notes (lower(agent_email));
alter table public.agent_notes enable row level security;

-- Свій email із токена; порівнюємо без урахування регістру.
create or replace function public.current_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
revoke execute on function public.current_email() from public;
grant execute on function public.current_email() to authenticated;

create policy "read own notes" on public.agent_notes for select to authenticated
  using (public.is_admin() or lower(agent_email) = public.current_email());
create policy "write own notes" on public.agent_notes for insert to authenticated
  with check (public.can_read_content()
              and lower(agent_email) = public.current_email()
              and public.current_email() <> '');
create policy "update own notes" on public.agent_notes for update to authenticated
  using (lower(agent_email) = public.current_email() and public.current_email() <> '')
  with check (lower(agent_email) = public.current_email());
create policy "delete own notes" on public.agent_notes for delete to authenticated
  using (lower(agent_email) = public.current_email() and public.current_email() <> '');
revoke all on public.agent_notes from anon;
grant select, insert, update, delete on public.agent_notes to authenticated;

-- Мови, текст яких скопійований з іншої мови й ще не перекладений.
-- Оператору такі мови не показуємо: інакше він прочитає клієнту текст
-- чужою мовою замість «скрипта немає».
alter table public.objections add column if not exists draft_langs text[] not null default '{}';
alter table public.rebuttals  add column if not exists draft_langs text[] not null default '{}';

-- Функції пошуку, стрічки змін і копії мовою — див. міграції
-- search_recent_and_clone: public.snippet(), public.search_content(),
-- public.recent_changes(), public.clone_objection().
-- Усі три SECURITY INVOKER, тож доступ обмежують ті самі політики.

-- ============================================================
-- 6c. АТОМАРНЫЙ РЕОРДЕР (стрелки ▲/▼ в админке)
-- Меняет местами sort_order двух строк в одной транзакции, чтобы
-- частичный сбой не оставил порядок в неконсистентном состоянии.
-- SECURITY INVOKER → апдейты под сессией админа, RLS is_admin() enforced.
-- ============================================================
create or replace function public.reorder_swap(p_table text, p_id1 uuid, p_id2 uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  s1 integer;
  s2 integer;
begin
  if p_table not in ('objections','stages','entries') then
    raise exception 'reorder_swap: table % not allowed', p_table;
  end if;
  execute format('select sort_order from public.%I where id = $1', p_table)
    into s1 using p_id1;
  execute format('select sort_order from public.%I where id = $1', p_table)
    into s2 using p_id2;
  if s1 is null or s2 is null then
    raise exception 'reorder_swap: row not found';
  end if;
  if s1 = s2 then
    s2 := s1 + 1;
  end if;
  execute format('update public.%I set sort_order = $1 where id = $2', p_table)
    using s2, p_id1;
  execute format('update public.%I set sort_order = $1 where id = $2', p_table)
    using s1, p_id2;
end;
$$;

revoke execute on function public.reorder_swap(text, uuid, uuid) from public, anon;
grant execute on function public.reorder_swap(text, uuid, uuid) to authenticated;

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
-- Чтение — только вошедший агент/админ (см. can_read_content ниже в разделе 7).
drop policy if exists "public read entries" on public.entries;
drop policy if exists "read entries" on public.entries;
create policy "read entries" on public.entries for select using (public.can_read_content());
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

-- Чтение контента: ТОЛЬКО вошедший агент/админ (функция can_read_content
-- определена выше, в разделе 6b). Анонимам чтение закрыто — нельзя выкачать
-- базу через REST API с anon-ключом.
drop policy if exists "public read languages"  on public.languages;
drop policy if exists "public read objections" on public.objections;
drop policy if exists "public read stages"     on public.stages;
drop policy if exists "public read rebuttals"  on public.rebuttals;
drop policy if exists "public read branches"   on public.branches;
drop policy if exists "read languages"  on public.languages;
drop policy if exists "read objections" on public.objections;
drop policy if exists "read stages"     on public.stages;
drop policy if exists "read rebuttals"  on public.rebuttals;
drop policy if exists "read branches"   on public.branches;
create policy "read languages"  on public.languages  for select using (public.can_read_content());
create policy "read objections" on public.objections for select using (public.can_read_content());
create policy "read stages"     on public.stages     for select using (public.can_read_content());
create policy "read rebuttals"  on public.rebuttals  for select using (public.can_read_content());
create policy "read branches"   on public.branches   for select using (public.can_read_content());

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
-- 7b. МИНИМИЗАЦИЯ ПРАВ anon (defense-in-depth)
-- RLS уже блокирует запись анонимам, но по умолчанию PostgREST выдаёт
-- ролям anon/authenticated ALL на таблицы public. Снимаем у anon всё,
-- кроме чтения контента, чтобы запись была невозможна и на уровне грантов.
-- ============================================================
revoke insert, update, delete, truncate, references, trigger
  on public.languages, public.objections, public.stages,
     public.rebuttals, public.branches, public.entries
  from anon;

-- Служебные таблицы: anon обращается к ним только через SECURITY DEFINER
-- RPC is_agent_allowed (не зависит от этих грантов) — убираем доступ целиком.
revoke all privileges on public.agent_emails from anon;
revoke all privileges on public.admins       from anon;

-- Проверка email в белом списке нужна только ДО входа (роль anon);
-- авторизованному агенту — нет (иначе возможен перебор email).
revoke execute on function public.is_agent_allowed(text) from authenticated;

-- ============================================================
-- 8. НАЗНАЧИТЬ СЕБЯ АДМИНОМ
-- ============================================================
-- 1) Создать пользователя: Supabase → Authentication → Users → Add user (email+пароль)
-- 2) Раскомментировать и подставить свой email:
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'ВАШ_EMAIL'
-- on conflict (user_id) do nothing;

-- ============================================================
-- 6f. ОЦІНКА СКРИПТА І АКТУАЛЬНІСТЬ (хвиля 2)
-- ============================================================
-- Голос і пропозиція розділені навмисно. Голос — один на оператора для
-- пари «заперечення × етап × мова», і його можна перерішити: це власна
-- думка, а не журнал. Пропозиція правки неізмінна: адмін лише розбирає.
create table if not exists public.script_votes (
  id           uuid primary key default gen_random_uuid(),
  agent_email  text not null,
  objection_id uuid not null references public.objections(id) on delete cascade,
  stage_id     uuid not null references public.stages(id) on delete cascade,
  lang         text not null,
  vote         text not null check (vote in ('up', 'down')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (agent_email, objection_id, stage_id, lang)
);
create index if not exists script_votes_script_idx
  on public.script_votes (objection_id, stage_id, lang);
alter table public.script_votes enable row level security;
create policy "read own votes" on public.script_votes for select to authenticated
  using (public.is_admin() or lower(agent_email) = public.current_email());
create policy "insert own vote" on public.script_votes for insert to authenticated
  with check (public.can_read_content()
              and lower(agent_email) = public.current_email()
              and public.current_email() <> '');
create policy "update own vote" on public.script_votes for update to authenticated
  using (lower(agent_email) = public.current_email() and public.current_email() <> '')
  with check (lower(agent_email) = public.current_email());
create policy "delete own vote" on public.script_votes for delete to authenticated
  using (lower(agent_email) = public.current_email() and public.current_email() <> '');
revoke all on public.script_votes from anon;
grant select, insert, update, delete on public.script_votes to authenticated;

create table if not exists public.script_suggestions (
  id           uuid primary key default gen_random_uuid(),
  agent_email  text,
  objection_id uuid not null references public.objections(id) on delete cascade,
  stage_id     uuid not null references public.stages(id) on delete cascade,
  lang         text not null,
  body         text not null,
  status       text not null default 'new' check (status in ('new', 'done', 'dismissed')),
  created_at   timestamptz not null default now()
);
create index if not exists script_suggestions_status_idx
  on public.script_suggestions (status, created_at desc);
alter table public.script_suggestions enable row level security;
create policy "read suggestions" on public.script_suggestions for select to authenticated
  using (public.is_admin() or lower(coalesce(agent_email, '')) = public.current_email());
create policy "insert suggestion" on public.script_suggestions for insert to authenticated
  with check (public.can_read_content());
create policy "admin triages suggestion" on public.script_suggestions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.script_suggestions from anon;
revoke update, delete, truncate, references, trigger
  on public.script_suggestions from authenticated;
grant select, insert on public.script_suggestions to authenticated;
-- Текст пропозиції не править ніхто; адмін міняє лише статус, тому право
-- update видано на одну колонку, а не на таблицю.
grant update (status) on public.script_suggestions to authenticated;

-- Актуальність: перевірка і редагування — різні події. Текст могли
-- переписати, не звіряючи умови з тарифами, тому дати окремі, а
-- «змінений після перевірки» показуємо як окремий сигнал.
alter table public.rebuttals add column if not exists reviewed_at timestamptz;
alter table public.rebuttals add column if not exists reviewed_by text;

-- Функції зведень: feedback_summary(), stale_scripts(), mark_reviewed() —
-- див. міграції script_feedback_and_freshness та
-- feedback_and_freshness_summaries. Усі SECURITY INVOKER.

-- ============================================================
-- 6g. РОЛЬ СУПЕРВАЙЗЕРА (хвиля 2)
-- ============================================================
-- Керівнику групи потрібні цифри, але не потрібна кнопка «видалити».
-- Роль лежить у тій самій таблиці admins: окрема таблиця дала б другий
-- шлях входу в адмінку, а це зайва поверхня.
alter table public.admins add column if not exists role text not null default 'admin';
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check
  check (role in ('admin', 'supervisor'));

-- is_admin() лишається «повний доступ»: усі політики запису спираються на
-- неї, і супервайзер під неї не підпадає.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid() and a.role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Хто вправі дивитися звіти: адмін і супервайзер.
create or replace function public.can_read_reports()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke execute on function public.can_read_reports() from public;
grant execute on function public.can_read_reports() to anon, authenticated;

-- Роль поточного користувача для інтерфейсу.
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select a.role from public.admins a where a.user_id = auth.uid();
$$;
revoke execute on function public.my_role() from public;
grant execute on function public.my_role() to authenticated;

-- Журнали й відгуки читає той, хто вправі дивитися звіти. Розбирати
-- пропозиції та відмічати перевірку лишається правом адміна: політики
-- update і mark_reviewed() спираються на is_admin().
create policy "reports read script_views" on public.script_views
  for select to authenticated using (public.can_read_reports());
create policy "reports read agent_logins" on public.agent_logins
  for select to authenticated using (public.can_read_reports());
create policy "reports read script_outcomes" on public.script_outcomes
  for select to authenticated using (public.can_read_reports());

-- Сама таблиця admins під RLS: свій рядок бачить кожен (потрібно клієнту
-- для визначення ролі), керує списком лише адмін.
alter table public.admins enable row level security;
create policy "admin manage admins" on public.admins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid());
revoke all on public.admins from anon;
grant select, insert, update, delete on public.admins to authenticated;

-- ============================================================
-- 6h. ШІ-ПІДКАЗКИ ВАРІАНТІВ ВІДПОВІДІ
-- ============================================================
-- Інструмент наповнення, а не суфлер у дзвінку: оператор нічого
-- згенерованого не бачить, поки адмін не збереже текст звичайним чином.
-- Ключ моделі живе в edge-функції suggest-rebuttals, у браузерний бандл
-- не потрапляє. Журнал потрібен для контролю витрат і аудиту.
create table if not exists public.ai_suggestions (
  id            uuid primary key default gen_random_uuid(),
  admin_email   text,
  admin_id      uuid,
  objection_id  uuid references public.objections(id) on delete set null,
  stage_id      uuid references public.stages(id) on delete set null,
  lang          text not null,
  model         text not null,
  variants      integer not null default 0,
  tokens_in     integer,
  tokens_out    integer,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists ai_suggestions_created_idx on public.ai_suggestions (created_at desc);
create index if not exists ai_suggestions_admin_idx on public.ai_suggestions (admin_id, created_at desc);

alter table public.ai_suggestions enable row level security;
create policy "reports read ai_suggestions" on public.ai_suggestions
  for select to authenticated using (public.can_read_reports());
revoke all on public.ai_suggestions from anon;
revoke insert, update, delete, truncate on public.ai_suggestions from authenticated;
grant select on public.ai_suggestions to authenticated;
-- Пише лише edge-функція під сервісною роллю.

-- Запобіжник від випадкового циклу запитів: генерації коштують грошей.
create or replace function public.ai_usage_last_hour(p_admin uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.ai_suggestions
  where admin_id = p_admin and error is null
    and created_at > now() - interval '1 hour';
$$;
-- УВАГА: створення функції видає EXECUTE ролям anon і authenticated за
-- замовчуванням, і `revoke from public` цього не знімає. Права треба
-- знімати поіменно, інакше SECURITY DEFINER функція доступна кожному
-- залогіненому через /rest/v1/rpc.
revoke all on function public.ai_usage_last_hour(uuid) from public, anon, authenticated;
grant execute on function public.ai_usage_last_hour(uuid) to service_role;

-- ai_prompt_context повертає ТЕКСТИ затверджених скриптів — саме те, що
-- в застосунку заборонено копіювати. Викликає її лише edge-функція.
revoke all on function public.ai_prompt_context(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.ai_prompt_context(uuid, uuid, text) to service_role;

-- Контекст запиту одним викликом: заперечення, етап і три вже
-- затверджені скрипти тією ж мовою як зразок тону.
-- Тіло див. у міграції ai_suggestions_log.
