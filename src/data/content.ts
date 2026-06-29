import type {
  Branch,
  Objection,
  ObjectionId,
  Rebuttal,
  Stage,
  StageId,
} from '../types'

/* ─────────────────────────────────────────────────────────
 * ВОЗРАЖЕНИЯ (Шаг 1)
 * ───────────────────────────────────────────────────────── */
export const objections: Objection[] = [
  {
    id: 'no_funds',
    label: { ru: 'Нет денег', pl: 'Brak środków' },
    hint: { ru: '«немає коштів»', pl: '«brak środków»' },
  },
  {
    id: 'consult',
    label: { ru: 'Надо посоветоваться', pl: 'Muszę się poradzić' },
    hint: {
      ru: 'с женой / мужем, партнёром',
      pl: 'z żoną / mężem, partnerem',
    },
  },
  {
    id: 'not_interested',
    label: { ru: 'Не интересно', pl: 'Nie interesuje mnie' },
    hint: { ru: '«мені не цікаво»', pl: '«nie jestem zainteresowany»' },
  },
  {
    id: 'call_later',
    label: { ru: 'Перезвоните позже', pl: 'Proszę oddzwonić później' },
    hint: { ru: '«передзвоніть пізніше»', pl: '«proszę oddzwonić»' },
  },
]

/* ─────────────────────────────────────────────────────────
 * ЭТАПЫ РАЗГОВОРА (Шаг 2)
 * ───────────────────────────────────────────────────────── */
export const stages: Stage[] = [
  {
    id: 'intro',
    label: { ru: 'Интро', pl: 'Intro' },
    hint: { ru: 'презентация, спич', pl: 'prezentacja, pitch' },
  },
  {
    id: 'before_lk',
    label: { ru: 'До ЛК', pl: 'Przed KL' },
    hint: { ru: 'сумма · боли · бенефиты', pl: 'kwota · bóle · korzyści' },
  },
  {
    id: 'after_lk',
    label: { ru: 'После ЛК', pl: 'Po KL' },
    hint: { ru: 'повторные возражения', pl: 'powtórne obiekcje' },
  },
]

/* ─────────────────────────────────────────────────────────
 * СКРИПТЫ (Шаг 3) + ветви what-if
 *
 * Тексты ниже — структурные ЗАГЛУШКИ (draft: true).
 * Реальные спичи заказчик пришлёт в понедельник — нужно лишь
 * заменить строки answer/branches, структура останется той же.
 * ───────────────────────────────────────────────────────── */

const objLabelRu: Record<ObjectionId, string> = {
  no_funds: 'нет денег',
  consult: 'надо посоветоваться',
  not_interested: 'не интересно',
  call_later: 'перезвоните позже',
}
const objLabelPl: Record<ObjectionId, string> = {
  no_funds: 'brak środków',
  consult: 'muszę się poradzić',
  not_interested: 'nie interesuje mnie',
  call_later: 'oddzwonić później',
}
const stageLabelRu: Record<StageId, string> = {
  intro: 'на интро',
  before_lk: 'до личного кабинета',
  after_lk: 'после личного кабинета',
}
const stageLabelPl: Record<StageId, string> = {
  intro: 'na intro',
  before_lk: 'przed kontem klienta',
  after_lk: 'po koncie klienta',
}

/** Три стандартные ветки what-if под любую пару (возражение × этап) */
function makeBranches(o: ObjectionId, s: StageId): Branch[] {
  const ru = `${objLabelRu[o]} (${stageLabelRu[s]})`
  const pl = `${objLabelPl[o]} (${stageLabelPl[s]})`
  return [
    {
      label: { ru: 'Вариант A', pl: 'Wariant A' },
      condition: {
        ru: 'клиент уже называл конкретную причину',
        pl: 'klient podał już konkretny powód',
      },
      response: {
        ru: `[ШАБЛОН A · ${ru}] Признаём причину, отрабатываем её фактом/кейсом и мягко ведём к следующему шагу. Реальный текст добавим из материалов заказчика.`,
        pl: `[SZABLON A · ${pl}] Uznajemy powód, odpowiadamy faktem/case'em i prowadzimy do kolejnego kroku. Finalny tekst z materiałów klienta.`,
      },
    },
    {
      label: { ru: 'Вариант B', pl: 'Wariant B' },
      condition: {
        ru: 'причина не прозвучала, возражение «на автомате»',
        pl: 'powód nie padł, obiekcja „odruchowa”',
      },
      response: {
        ru: `[ШАБЛОН B · ${ru}] Задаём уточняющий вопрос, чтобы вскрыть истинную причину, и возвращаем инициативу. Реальный текст добавим позже.`,
        pl: `[SZABLON B · ${pl}] Zadajemy pytanie doprecyzowujące, by odkryć prawdziwy powód i odzyskać inicjatywę. Tekst dodamy później.`,
      },
    },
    {
      label: { ru: 'Вариант C', pl: 'Wariant C' },
      condition: {
        ru: 'другой сценарий / жёсткий отказ',
        pl: 'inny scenariusz / twarda odmowa',
      },
      response: {
        ru: `[ШАБЛОН C · ${ru}] Снимаем напряжение, фиксируем договорённость о следующем контакте, оставляем дверь открытой. Реальный текст добавим позже.`,
        pl: `[SZABLON C · ${pl}] Rozładowujemy napięcie, ustalamy następny kontakt i zostawiamy otwarte drzwi. Tekst dodamy później.`,
      },
    },
  ]
}

function draftRebuttal(objectionId: ObjectionId, stage: StageId): Rebuttal {
  return {
    objectionId,
    stage,
    answer: {
      ru: `[БАЗОВЫЙ СКРИПТ · ${objLabelRu[objectionId]} · ${stageLabelRu[stage]}] Здесь будет готовый ответ агента: присоединение → аргумент → вопрос-перехват. Подставится из материалов заказчика.`,
      pl: `[SKRYPT BAZOWY · ${objLabelPl[objectionId]} · ${stageLabelPl[stage]}] Tu pojawi się gotowa odpowiedź agenta: dołączenie → argument → pytanie. Z materiałów klienta.`,
    },
    branches: makeBranches(objectionId, stage),
    draft: true,
  }
}

/** Полностью заполненный пример — «нет денег» на этапе «До ЛК» */
const noFundsBeforeLk: Rebuttal = {
  objectionId: 'no_funds',
  stage: 'before_lk',
  answer: {
    ru: 'Понимаю вас — вопрос денег всегда важен, и хорошо, что вы об этом сразу говорите. Смотрите: сейчас в личном кабинете мы как раз подбираем сумму под ваш бюджет, а не наоборот. Давайте я покажу вариант с минимальным входом — вы ничего не теряете, просто увидите цифры. Скажите, какая сумма в месяц была бы для вас комфортной?',
    pl: 'Rozumiem — kwestia pieniędzy zawsze jest ważna i dobrze, że mówi Pan/Pani o tym od razu. Proszę spojrzeć: na koncie klienta dobieramy kwotę pod Pana/Pani budżet, a nie odwrotnie. Pokażę wariant z minimalnym wkładem — nic Pan/Pani nie traci, po prostu zobaczy liczby. Jaka kwota miesięcznie byłaby komfortowa?',
  },
  branches: [
    {
      label: { ru: 'Вариант A', pl: 'Wariant A' },
      condition: {
        ru: 'клиент назвал конкретную сумму бюджета',
        pl: 'klient podał konkretną kwotę budżetu',
      },
      response: {
        ru: 'Отлично, с этой суммой мы точно работаем. Я зафиксирую её и подберу формат, где платёж укладывается в ваш бюджет без переплат. Давайте оформим стартовый шаг прямо сейчас?',
        pl: 'Świetnie, z tą kwotą na pewno pracujemy. Zapiszę ją i dobiorę format, w którym rata mieści się w budżecie bez przepłacania. Zróbmy pierwszy krok teraz?',
      },
    },
    {
      label: { ru: 'Вариант B', pl: 'Wariant B' },
      condition: {
        ru: 'клиент уходит от конкретики по бюджету',
        pl: 'klient unika konkretów co do budżetu',
      },
      response: {
        ru: 'Понимаю, что не хочется называть цифры сходу. Тогда зайдём с другой стороны: что для вас важнее — минимальный платёж или быстрый результат? От этого зависит, какой вариант я вам покажу.',
        pl: 'Rozumiem, że niełatwo podać liczby od razu. To zajdźmy z innej strony: co jest ważniejsze — najniższa rata czy szybki efekt? Od tego zależy, który wariant pokażę.',
      },
    },
    {
      label: { ru: 'Вариант C', pl: 'Wariant C' },
      condition: {
        ru: 'жёсткое «денег нет совсем»',
        pl: 'twarde „w ogóle nie mam pieniędzy”',
      },
      response: {
        ru: 'Услышал вас, не давлю. Давайте поступим честно: я отправлю расчёт на почту и наберу вас, когда будет удобнее обсудить — например, ближе к зарплате. В какой день вам перезвонить?',
        pl: 'Słyszę i nie naciskam. Zróbmy uczciwie: wyślę wyliczenie na email i oddzwonię, gdy będzie wygodniej — np. bliżej wypłaty. W jaki dzień zadzwonić?',
      },
    },
  ],
}

/** Сборка полной матрицы: 4 возражения × 3 этапа = 12 скриптов */
function buildRebuttals(): Rebuttal[] {
  const list: Rebuttal[] = []
  for (const o of objections) {
    for (const s of stages) {
      if (o.id === 'no_funds' && s.id === 'before_lk') {
        list.push(noFundsBeforeLk)
      } else {
        list.push(draftRebuttal(o.id, s.id))
      }
    }
  }
  return list
}

export const rebuttals: Rebuttal[] = buildRebuttals()

export function getRebuttal(
  objectionId: ObjectionId,
  stage: StageId,
): Rebuttal | undefined {
  return rebuttals.find((r) => r.objectionId === objectionId && r.stage === stage)
}

export function getObjection(id: ObjectionId): Objection | undefined {
  return objections.find((o) => o.id === id)
}

export function getStage(id: StageId): Stage | undefined {
  return stages.find((s) => s.id === id)
}
