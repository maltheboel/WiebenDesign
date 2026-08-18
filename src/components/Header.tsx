const NAV_ITEMS = ['Løsninger', 'Proces', 'Cases', 'Messekalender', 'Om os']

// Flag emoji (🇬🇧) renders as two stacked letters "GB" instead of a flag on
// some platforms (notably Windows), so we use a real SVG flag instead.
function UkFlagIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true" className="shrink-0">
      <rect width="20" height="14" fill="#00247d" />
      <path d="M0,0 L20,14 M20,0 L0,14" stroke="#fff" strokeWidth="2.6" />
      <path d="M0,0 L20,14 M20,0 L0,14" stroke="#cf142b" strokeWidth="1" />
      <path d="M10,0 V14 M0,7 H20" stroke="#fff" strokeWidth="4.4" />
      <path d="M10,0 V14 M0,7 H20" stroke="#cf142b" strokeWidth="2.2" />
    </svg>
  )
}

export default function Header() {
  return (
    <header className="w-full border-b-2 border-wieben-teal bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="shrink-0">
          <img src="/wieben-logo.png" alt="Wieben Design" className="h-9 w-auto sm:h-10" />
        </a>

        <nav className="hidden lg:flex items-center gap-8">
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
            <UkFlagIcon />
            EN
          </button>
        </div>
      </div>
    </header>
  )
}
