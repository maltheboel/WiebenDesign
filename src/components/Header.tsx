const NAV_ITEMS = ['Løsninger', 'Proces', 'Cases', 'Messekalender', 'Om os']

export default function Header() {
  return (
    <header className="w-full border-b-2 border-wieben-teal bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="shrink-0">
          <img src="/wieben-logo.png" alt="Wieben Design" className="h-14 w-auto sm:h-16" />
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
            <span aria-hidden="true">🇬🇧</span>
            EN
          </button>
        </div>
      </div>
    </header>
  )
}
