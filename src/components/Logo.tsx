/**
 * Знак Convvy: кольцо «C» с переливом фиолетовый → синий, внутри белый
 * речевой пузырь с тремя точками.
 *
 * Нарисован вектором, а не подключён картинкой: знак стоит в шапке, на
 * входе и в фавиконе разных размеров, и растр на любом из них мылит.
 * Градиенту нужен уникальный id — иначе два знака на одной странице
 * делят один `<defs>` и второй теряет заливку.
 */
export function LogoMark({
  size = 32,
  className = '',
  id = 'convvy',
}: {
  size?: number
  className?: string
  id?: string
}) {
  const ring = `${id}-ring`
  const dots = `${id}-dots`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Convvy"
      className={className}
    >
      <defs>
        <linearGradient id={ring} x1="10" y1="8" x2="54" y2="56">
          <stop offset="0" stopColor="#8B2BF2" />
          <stop offset="1" stopColor="#1E5BFF" />
        </linearGradient>
        <linearGradient id={dots} x1="24" y1="32" x2="42" y2="32">
          <stop offset="0" stopColor="#8B2BF2" />
          <stop offset="1" stopColor="#1E5BFF" />
        </linearGradient>
      </defs>

      {/* Кольцо «C»: дуга обводкой, а не залитый контур. Залитая форма
          на 32px схлопывалась в пятно — у обводки толщина одинаковая по
          всей дуге и знак остаётся читаемым в шапке и в фавиконе. */}
      <path
        d="M47.6 16.4A22 22 0 1 0 47.6 47.6"
        stroke={`url(#${ring})`}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* Пузырь намеренно выходит за просвет и врезается в кольцо: целиком
          внутри он на белом фоне сливается с ним и знак теряет смысл. */}
      <g fill="#fff">
        <ellipse cx="33.5" cy="30" rx="14.5" ry="11.8" />
        <path d="M27.5 39.5 21.5 47.2c-.7.9.2 2.1 1.2 1.6l9.3-4.6-4.5-4.7Z" />
      </g>

      <g fill={`url(#${dots})`}>
        <circle cx="27.2" cy="30" r="2.6" />
        <circle cx="33.5" cy="30" r="2.6" />
        <circle cx="39.8" cy="30" r="2.6" />
      </g>
    </svg>
  )
}

/**
 * Знак вместе с начертанием. Слово набрано текстом, а не кривыми:
 * так оно остаётся выделяемым для скринридера и не мылится.
 */
export function Logo({
  size = 32,
  subtitle,
  id = 'convvy',
}: {
  size?: number
  subtitle?: string
  id?: string
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} id={id} />
      <span className="leading-tight">
        <span className="block text-[1.0625rem] font-bold tracking-tight text-ink">
          Convvy
        </span>
        {subtitle && (
          /* На узком экране подпись разъезжалась на три строки и душила
             шапку — там достаточно знака и названия. */
          <span className="hidden text-[11px] text-ink-3 sm:block">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  )
}
