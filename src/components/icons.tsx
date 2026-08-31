/**
 * Иконки интерфейса.
 *
 * Раньше здесь стояли юникодные глифы и эмодзи (`⌕`, `✕`, `★`, `→`,
 * `👍`). Они выглядят по-разному в каждой системе, не бывают одной
 * толщины и не наследуют цвет. Набор нарисован сам: сетка 20, штрих 1.6,
 * скруглённые концы, `currentColor`.
 */

interface IconProps {
  size?: number
  className?: string
}

function Svg({
  size = 20,
  className = '',
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 3.5 3.5" />
    </Svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </Svg>
  )
}

export function IconArrowRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10h11.5M11 5.5 15.5 10 11 14.5" />
    </Svg>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Svg>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 4.5v11M4.5 10h11" />
    </Svg>
  )
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 4.5h4.5V9" />
      <path d="M15.5 4.5 9 11" />
      <path d="M15.5 12v3a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h3" />
    </Svg>
  )
}

/** Звезда избранного: контур и заливка — одна форма, разное состояние. */
export function IconStar({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="M10 3.5l2.06 4.18 4.61.67-3.34 3.25.79 4.6L10 14.03l-4.12 2.17.79-4.6L3.33 8.35l4.61-.67L10 3.5Z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </Svg>
  )
}

export function IconThumbUp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 17V8.5l3-5a1.8 1.8 0 0 1 2.6 2.2L11.2 8.5h3.6a1.6 1.6 0 0 1 1.56 1.96l-1.1 5A1.6 1.6 0 0 1 13.7 17H6.5Z" />
      <path d="M6.5 8.5H4.2a.7.7 0 0 0-.7.7v6.6a.7.7 0 0 0 .7.7h2.3" />
    </Svg>
  )
}

export function IconThumbDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 3v8.5l3 5a1.8 1.8 0 0 0 2.6-2.2l-.9-2.8h3.6a1.6 1.6 0 0 0 1.56-1.96l-1.1-5A1.6 1.6 0 0 0 13.7 3H6.5Z" />
      <path d="M6.5 11.5H4.2a.7.7 0 0 1-.7-.7V4.2a.7.7 0 0 1 .7-.7h2.3" />
    </Svg>
  )
}

/** Пометка исхода: разговор закрыт удачно. */
export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="2.5" />
    </Svg>
  )
}

/** Перезвон. */
export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.2V10l2.6 1.6" />
    </Svg>
  )
}

/** Не сработало. */
export function IconSlash(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="m6.2 13.8 7.6-7.6" />
    </Svg>
  )
}

export function IconSparkle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 3.5c.5 3.2 1.3 4 4.5 4.5-3.2.5-4 1.3-4.5 4.5-.5-3.2-1.3-4-4.5-4.5 3.2-.5 4-1.3 4.5-4.5Z" />
      <path d="M15 13c.25 1.5.65 1.9 2.15 2.15-1.5.25-1.9.65-2.15 2.15-.25-1.5-.65-1.9-2.15-2.15C14.35 14.9 14.75 14.5 15 13Z" />
    </Svg>
  )
}

export function IconNote(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 5.2a.7.7 0 0 1 .7-.7h9.6a.7.7 0 0 1 .7.7v6.3l-4 4H5.2a.7.7 0 0 1-.7-.7V5.2Z" />
      <path d="M15.5 11.5h-3.3a.7.7 0 0 0-.7.7v3.3" />
    </Svg>
  )
}
