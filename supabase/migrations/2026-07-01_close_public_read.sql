-- ============================================================
-- Закрыть ПУБЛИЧНОЕ чтение контента.
-- Раньше контент читался анонимом (using (true)) — любой мог выкачать
-- всю базу через REST API с anon-ключом, минуя интерфейс. Теперь читать
-- контент может только ВОШЕДШИЙ агент (email в agent_emails) или админ.
-- Анонимный запрос вернёт 0 строк.
--
-- Идемпотентно: можно запускать повторно.
-- ============================================================

-- 1) Хелпер: имеет ли текущий пользователь право читать контент.
--    SECURITY DEFINER — сам читает agent_emails независимо от грантов роли.
--    auth.jwt()/auth.uid() внутри по-прежнему отражают реального вызывающего.
create or replace function public.can_read_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.agent_emails a
      where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

-- Функция возвращает только boolean о самом вызывающем — не раскрывает список.
revoke execute on function public.can_read_content() from public;
grant  execute on function public.can_read_content() to anon, authenticated;

-- 2) Заменяем «публичное чтение (true)» на «только вошедший агент/админ».
drop policy if exists "public read languages"  on public.languages;
drop policy if exists "public read objections" on public.objections;
drop policy if exists "public read stages"     on public.stages;
drop policy if exists "public read rebuttals"  on public.rebuttals;
drop policy if exists "public read branches"   on public.branches;
drop policy if exists "public read entries"    on public.entries;

-- на случай повторного запуска — сносим и новые имена
drop policy if exists "read languages"  on public.languages;
drop policy if exists "read objections" on public.objections;
drop policy if exists "read stages"     on public.stages;
drop policy if exists "read rebuttals"  on public.rebuttals;
drop policy if exists "read branches"   on public.branches;
drop policy if exists "read entries"    on public.entries;

create policy "read languages"  on public.languages  for select using (public.can_read_content());
create policy "read objections" on public.objections for select using (public.can_read_content());
create policy "read stages"     on public.stages     for select using (public.can_read_content());
create policy "read rebuttals"  on public.rebuttals  for select using (public.can_read_content());
create policy "read branches"   on public.branches   for select using (public.can_read_content());
create policy "read entries"    on public.entries    for select using (public.can_read_content());

-- 3) (Опц.) Проверка. Должно вернуть false для анонимного вызова:
--    select public.can_read_content();
