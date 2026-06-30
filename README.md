# Convvy — Скрипты отработки возражений

Внутренний веб-инструмент (шпаргалка) для агентов колл-центра **Convvy**.
Во время звонка агент за 3 шага находит готовый скрипт под конкретное
возражение и этап разговора, с ветвлением «what-if». Контент двуязычный — **RU / PL**.

## Логика навигации

1. **Шаг 1 — Возражение:** нет денег · надо посоветоваться · не интересно · перезвоните позже
2. **Шаг 2 — Этап разговора:** Интро · До ЛК · После ЛК
3. **Шаг 3 — Готовый ответ:** базовый скрипт + до 3 веток what-if
   (если X было → так; если не было → иначе; другой сценарий)

Переключатель языка **RU/PL** в шапке. Вход — email + 2FA код на почту.

## Деплой (Netlify)

Проект хостится на **Netlify** как статический сайт. Конфигурация — в
[`netlify.toml`](netlify.toml):

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node:** 20 (`NODE_VERSION` в `[build.environment]`)
- **SPA-fallback:** все пути отдают `index.html` (правило в `netlify.toml`
  и резервно в `public/_redirects`) — нужно для роутера (`/`, `/admin`).
- **Security-заголовки** и кэширование захэшированных ассетов настроены там же.

Деплой: подключить репозиторий в Netlify (*Add new site → Import from Git*).
Билд-настройки Netlify подхватит из `netlify.toml` автоматически.

### Переменные окружения

Задаются в *Site configuration → Environment variables*. Vite встраивает их
**на этапе сборки**, поэтому после изменения нужен **Redeploy** (Trigger deploy
→ Deploy site).

| Переменная | Назначение |
| --- | --- |
| `VITE_SUPABASE_URL` | URL проекта Supabase (Project Settings → API). |
| `VITE_SUPABASE_ANON_KEY` | Публичный anon-ключ Supabase. |

Переменные Supabase нужны и для контента, и для **входа агентов по коду на
email** (OTP). Если они не заданы — вход агентов недоступен, приложение
работает на встроенном статическом контенте (`src/data/content.ts`), а админка
показывает «Supabase не настроен».

## Контент в Supabase + админ-панель

Контент (языки, возражения, этапы, скрипты с ветками what-if) хранится в
**Supabase**. Браузер ходит в БД напрямую через `anon`-ключ; чтения публичны,
записи защищены **RLS** (`is_admin()`).

- **«Категория» = язык.** Языки — это данные (таблица `languages`), а
  локализованные поля — JSONB по коду языка (`{"ru":"…","pl":"…"}`). Добавив язык
  в админке, вы получаете поле под него во всех формах. UI-подписи кнопок пока
  переведены на RU/PL (`src/i18n/ui.ts`), для остальных языков — fallback на RU.
- **Админ-панель — `/admin`.** Вход через **Supabase Auth** (email+пароль).
  Право на запись есть только у пользователей из таблицы `admins`. Вкладки:
  **Языки · Возражения · Этапы · Скрипты**.

### Первичная настройка Supabase

1. Создать проект на supabase.com → *Project Settings → API*: скопировать
   **Project URL** и **anon public key** в `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` (локально — в `.env.local`, в Netlify — в env-переменные).
2. Выполнить SQL-схему (DDL + RLS) в *SQL Editor* — см. `supabase/schema.sql`.
   Опционально прогнать сид текущего контента — `supabase/seed.sql`.
3. Создать админа: *Authentication → Users → Add user* (email+пароль), затем
   добавить его в таблицу `admins` (запрос есть в конце `supabase/schema.sql`).

> ⚠️ anon-ключ даёт публичное **чтение** контента всем, у кого он есть (в обход
> пароля агентов). Для внутреннего инструмента это приемлемо; записи закрыты RLS.
> Нужна строгая изоляция — выносить доступ в Netlify Functions с service-ключом.

## Стек

- **React + Vite + TypeScript**
- **Tailwind CSS v4** (простая светлая палитра: нейтральный серый + один акцент — indigo)
- **react-router-dom** — маршруты `/` (агент) и `/admin` (панель)
- **Supabase** — БД контента + Auth для админа (`@supabase/supabase-js`)
- Навигация внутри шагов — на состоянии; контент грузится из Supabase
  (фолбэк — статические данные в `src/data/content.ts`)

## Запуск

```bash
npm install
npm run dev      # дев-сервер
npm run build    # прод-сборка в dist/
npm run preview  # предпросмотр сборки
```

## Авторизация (код на email · OTP)

Вход агента (`/`) — по **одноразовому коду на email** через **Supabase Auth**
(`src/hooks/useAuth.ts`). Сессия (JWT) хранится и обновляется самим
`supabase-js`.

Поток входа в два шага:

1. Агент вводит **email**. Приложение проверяет его по белому списку через
   RPC `public.is_agent_allowed(email)` — функция `SECURITY DEFINER`, доступна
   анонимам и возвращает только `true/false`, не раскрывая сам список.
2. Если email разрешён — Supabase шлёт письмо с **6-значным кодом**
   (`auth.signInWithOtp`). Агент вводит код, приложение сверяет его
   (`auth.verifyOtp`) и открывает сессию.

### Белый список агентов

Кому можно входить — задаётся таблицей **`public.agent_emails`** (миграция
`agent_email_allowlist`). Управлять списком может только админ (RLS
`is_admin()`). Добавить агента:

```sql
insert into public.agent_emails (email, note) values ('agent@convvy.com', 'имя');
```

### Что нужно настроить в Supabase, чтобы код приходил

> ⚠️ **Доставка письма.** Встроенный почтовик Supabase шлёт письма только на
> адреса команды проекта и жёстко лимитирован — для реальных агентов задайте
> **свой SMTP**: *Authentication → Emails → SMTP Settings*.
>
> ⚠️ **Шаблон письма** должен содержать сам код — переменную `{{ .Token }}`
> (*Authentication → Emails → Magic Link*), иначе в письме будет только ссылка,
> а не 6-значный код для ввода.
>
> Также включите Email-провайдер: *Authentication → Sign In / Providers →
> Email*.

## Контент

Реальные скрипты заказчик присылает структурно. Сейчас в `content.ts` лежат
заглушки (помечены `draft: true`) и один полностью заполненный пример —
«нет денег» × «До ЛК». Чтобы подставить финальные тексты, достаточно
заменить строки `answer` и `branches[].response` для нужной пары
*возражение × этап* — структура данных остаётся прежней.

Тип записи:

```ts
interface Rebuttal {
  objectionId: ObjectionId       // 'no_funds' | 'consult' | 'not_interested' | 'call_later'
  stage: StageId                 // 'intro' | 'before_lk' | 'after_lk'
  answer: Record<'ru'|'pl', string>
  branches: {
    label: Record<'ru'|'pl', string>      // «Вариант A/B/C»
    condition: Record<'ru'|'pl', string>  // что было/не было в диалоге
    response: Record<'ru'|'pl', string>   // ответ под это условие
  }[]
}
```
