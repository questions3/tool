-- ============================================================
-- Convvy — сид текущего контента (RU/PL).
-- Выполнить ПОСЛЕ schema.sql. Идемпотентно (on conflict / not exists).
-- ============================================================

-- Языки -----------------------------------------------------------------------
insert into public.languages (code, name, sort_order) values
  ('ru','Русский',0),
  ('pl','Polski',1)
on conflict (code) do nothing;

-- Возражения ------------------------------------------------------------------
insert into public.objections (slug, label, hint, sort_order) values
  ('no_funds',       '{"ru":"Нет денег","pl":"Brak środków"}',                    '{"ru":"«немає коштів»","pl":"«brak środków»"}', 0),
  ('consult',        '{"ru":"Надо посоветоваться","pl":"Muszę się poradzić"}',    '{"ru":"с женой / мужем, партнёром","pl":"z żoną / mężem, partnerem"}', 1),
  ('not_interested', '{"ru":"Не интересно","pl":"Nie interesuje mnie"}',          '{"ru":"«мені не цікаво»","pl":"«nie jestem zainteresowany»"}', 2),
  ('call_later',     '{"ru":"Перезвоните позже","pl":"Proszę oddzwonić później"}','{"ru":"«передзвоніть пізніше»","pl":"«proszę oddzwonić»"}', 3)
on conflict (slug) do nothing;

-- Этапы -----------------------------------------------------------------------
insert into public.stages (slug, label, hint, sort_order) values
  ('intro',     '{"ru":"Интро","pl":"Intro"}',    '{"ru":"презентация, спич","pl":"prezentacja, pitch"}', 0),
  ('before_lk', '{"ru":"До ЛК","pl":"Przed KL"}', '{"ru":"сумма · боли · бенефиты","pl":"kwota · bóle · korzyści"}', 1),
  ('after_lk',  '{"ru":"После ЛК","pl":"Po KL"}', '{"ru":"повторные возражения","pl":"powtórne obiekcje"}', 2)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- Заполненный пример-скрипт: «нет денег» × «До ЛК» (не черновик).
-- Остальные 11 пар остаются пустыми — добавьте их через админку.
-- ----------------------------------------------------------------------------
insert into public.rebuttals (objection_id, stage_id, answer, is_draft)
select o.id, s.id,
  '{"ru":"Понимаю вас — вопрос денег всегда важен, и хорошо, что вы об этом сразу говорите. Смотрите: сейчас в личном кабинете мы как раз подбираем сумму под ваш бюджет, а не наоборот. Давайте я покажу вариант с минимальным входом — вы ничего не теряете, просто увидите цифры. Скажите, какая сумма в месяц была бы для вас комфортной?","pl":"Rozumiem — kwestia pieniędzy zawsze jest ważna i dobrze, że mówi Pan/Pani o tym od razu. Proszę spojrzeć: na koncie klienta dobieramy kwotę pod Pana/Pani budżet, a nie odwrotnie. Pokażę wariant z minimalnym wkładem — nic Pan/Pani nie traci, po prostu zobaczy liczby. Jaka kwota miesięcznie byłaby komfortowa?"}'::jsonb,
  false
from public.objections o, public.stages s
where o.slug = 'no_funds' and s.slug = 'before_lk'
on conflict (objection_id, stage_id) do nothing;

-- Ветки what-if для этого скрипта (только если их ещё нет)
insert into public.branches (rebuttal_id, label, condition, response, sort_order)
select r.id, v.label::jsonb, v.condition::jsonb, v.response::jsonb, v.ord
from public.rebuttals r
join public.objections o on o.id = r.objection_id and o.slug = 'no_funds'
join public.stages     s on s.id = r.stage_id     and s.slug = 'before_lk'
cross join (values
  (
    '{"ru":"Вариант A","pl":"Wariant A"}',
    '{"ru":"клиент назвал конкретную сумму бюджета","pl":"klient podał konkretną kwotę budżetu"}',
    '{"ru":"Отлично, с этой суммой мы точно работаем. Я зафиксирую её и подберу формат, где платёж укладывается в ваш бюджет без переплат. Давайте оформим стартовый шаг прямо сейчас?","pl":"Świetnie, z tą kwotą na pewno pracujemy. Zapiszę ją i dobiorę format, w którym rata mieści się w budżecie bez przepłacania. Zróbmy pierwszy krok teraz?"}',
    0
  ),
  (
    '{"ru":"Вариант B","pl":"Wariant B"}',
    '{"ru":"клиент уходит от конкретики по бюджету","pl":"klient unika konkretów co do budżetu"}',
    '{"ru":"Понимаю, что не хочется называть цифры сходу. Тогда зайдём с другой стороны: что для вас важнее — минимальный платёж или быстрый результат? От этого зависит, какой вариант я вам покажу.","pl":"Rozumiem, że niełatwo podać liczby od razu. To zajdźmy z innej strony: co jest ważniejsze — najniższa rata czy szybki efekt? Od tego zależy, który wariant pokażę."}',
    1
  ),
  (
    '{"ru":"Вариант C","pl":"Wariant C"}',
    '{"ru":"жёсткое «денег нет совсем»","pl":"twarde „w ogóle nie mam pieniędzy”"}',
    '{"ru":"Услышал вас, не давлю. Давайте поступим честно: я отправлю расчёт на почту и наберу вас, когда будет удобнее обсудить — например, ближе к зарплате. В какой день вам перезвонить?","pl":"Słyszę i nie naciskam. Zróbmy uczciwie: wyślę wyliczenie na email i oddzwonię, gdy będzie wygodniej — np. bliżej wypłaty. W jaki dzień zadzwonić?"}',
    2
  )
) as v(label, condition, response, ord)
where not exists (
  select 1 from public.branches b where b.rebuttal_id = r.id
);
