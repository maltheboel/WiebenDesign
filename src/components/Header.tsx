const NAV_ITEMS = ['Løsninger', 'Proces', 'Cases', 'Messekalender', 'Om os']

function Logo() {
  return (
    <a href="#" className="flex items-center gap-2 shrink-0">
      <span className="text-xl font-extrabold leading-4 tracking-tight text-wieben-forest">
        wieben
        <br />
        design
      </span>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <rect width="34" height="34" rx="9" className="fill-wieben-forest-light" />
        <path
          d="M8 20c1.5-4 3-6 5-6s2.5 5 4.5 5 2-6 4.5-6 3.5 4.5 5 4.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </a>
  )
}

export default function Header() {
  return (
    <header className="w-full border-b border-wieben-forest/10 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              className="text-[15px] font-medium text-wieben-forest hover:text-wieben-forest-light transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="#kontakt"
            className="rounded-md bg-wieben-forest-light px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm hover:bg-wieben-forest transition-colors"
          >
            Kontakt
          </a>
          <button
            type="button"
            className="hidden sm:flex items-center gap-1.5 text-[15px] font-medium text-wieben-forest"
            aria-label="Skift sprog til engelsk"
          >
            <span aria-hidden="true">🇬🇧</span>
            EN
          </button>
        </div>
      </div>
    </header>
  )
}
