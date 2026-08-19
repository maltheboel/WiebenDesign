const NAV_ITEMS = ['Løsninger', 'Proces', 'Cases', 'Messekalender', 'Om os']

// Flag emoji renders unreliably across platforms (e.g. shows as two stacked
// letters instead of a flag on Windows), so we use a real SVG flag instead.
// Same 20x14 viewBox/size as the flag it replaces, so layout is unaffected.
function UsFlagIcon() {
  const stripeHeight = 14 / 13
  const redStripeYs = [0, 2, 4, 6, 8, 10, 12].map((i) => i * stripeHeight)
  const starRows = [1.5, 3.75, 6]
  const starCols = [1, 2.6, 4.2, 5.8, 7.4]

  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" className="shrink-0">
      <rect width="20" height="14" fill="#fff" />
      {redStripeYs.map((y) => (
        <rect key={y} y={y} width="20" height={stripeHeight} fill="#b22234" />
      ))}
      <rect width="8" height={7 * stripeHeight} fill="#3c3b6e" />
      {starRows.map((y) =>
        starCols.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.32" fill="#fff" />),
      )}
    </svg>
  )
}

export default function Header() {
  return (
    <header className="w-full border-b-2 border-wieben-teal bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="shrink-0">
          <img src={`${import.meta.env.BASE_URL}wieben-logo.png`} alt="Wieben Design" className="h-9 w-auto sm:h-10" />
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          <a
            href="#konfigurator"
            className="text-[15px] font-semibold text-wieben-teal hover:text-wieben-teal-dark transition-colors"
          >
            Prisberegner
          </a>
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              className="text-[15px] font-semibold text-neutral-900 hover:text-wieben-teal transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <a
            href="#kontakt"
            className="rounded-md bg-wieben-teal px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-wieben-teal-dark transition-colors"
          >
            Kontakt
          </a>
          <button
            type="button"
            className="hidden sm:flex items-center gap-1.5 text-[15px] font-semibold text-neutral-900"
            aria-label="Skift sprog til engelsk"
          >
            <UsFlagIcon />
            EN
          </button>
        </div>
      </div>
    </header>
  )
}
