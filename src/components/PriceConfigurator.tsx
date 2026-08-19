import { useEffect, useRef, useState } from 'react'
import {
  CATEGORY_META,
  PRICING_CONFIG,
  calculatePrice,
  type AudioPresentation,
  type BuildHelp,
  type CateringItem,
  type ConfiguratorAnswers,
  type FloorChoice,
  type OpenSides,
  type OwnFloorType,
  type PriceCategory,
  type ProductDisplay,
  type YesNo,
} from '../pricing/config'
import { generateSummaryPdf } from '../pdf/generateSummaryPdf'

// Simple, DKK-formatteret visning uden decimaler
const formatKr = (n: number) => `${n.toLocaleString('da-DK')} kr.`

// Delt easing-kurve for et roligt, "premium" bevægelsesmønster på tværs af
// hele konfiguratoren (progress-bar, trin-skift, knapper, kort).
const EASE_PREMIUM = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_SETTLE = 'cubic-bezier(0.34, 1.56, 0.64, 1)' // let "overshoot" til release-animationer

type Direction = 'forward' | 'backward'
type Phase = 'questions' | 'upsell' | 'success' | 'summary'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Animerer et tal glidende mod en ny værdi, som et taxameter, i stedet for at
// "hoppe" til den nye pris. Bruges til den løbende prisindikator, der er
// synlig hele vejen gennem flowet. Fortsætter fra den aktuelt VISTE værdi
// (ikke det gamle mål), så hurtige ændringer — fx mens m²-sliderens trækkes —
// altid ser glidende ud i stedet for at hakke.
function useAnimatedNumber(target: number, duration = 500) {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (prefersReducedMotion()) {
      displayRef.current = target
      setDisplay(target)
      return
    }
    cancelAnimationFrame(rafRef.current!)
    const from = displayRef.current
    if (from === target) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out-cubic
      const next = Math.round(from + (target - from) * eased)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [target, duration])

  return display
}

// Løbende prisestimat, synligt gennem hele flowet (ikke kun til sidst), så
// brugeren kan se konsekvensen af hvert valg med det samme.
function LivePriceTicker({ low, high }: { low: number; high: number }) {
  const animatedLow = useAnimatedNumber(low)
  const animatedHigh = useAnimatedNumber(high)
  return (
    <div className="sticky top-4 z-20 mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-wieben-forest/10 bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
      <span className="text-xs font-semibold uppercase tracking-wide text-wieben-forest/50">Estimeret pris lige nu</span>
      <span className="text-lg font-bold tabular-nums text-wieben-forest">
        {formatKr(animatedLow)} – {formatKr(animatedHigh)}
      </span>
    </div>
  )
}

// Rækkefølgen af kernespørgsmål. "floorType" er et betinget opfølgnings-
// spørgsmål, der kun indgår når brugeren har valgt "eget gulv" — listen
// genberegnes derfor løbende ud fra de aktuelle svar, så step-indekset altid
// peger på det rigtige spørgsmål, uanset hvornår brugeren ændrer sit svar.
type CoreStepId =
  | 'size'
  | 'openSides'
  | 'hangingSign'
  | 'floor'
  | 'floorType'
  | 'productDisplay'
  | 'audioPresentation'
  | 'catering'
  | 'buildHelp'

function getCoreSteps(answers: ConfiguratorAnswers): CoreStepId[] {
  const ids: CoreStepId[] = ['size', 'openSides', 'hangingSign', 'floor']
  if (answers.floor === 'own') ids.push('floorType')
  ids.push('productDisplay', 'audioPresentation', 'catering', 'buildHelp')
  return ids
}

type OptionCard<T extends string | number> = {
  value: T
  title: string
  description: string
}

const OPEN_SIDES_OPTIONS: OptionCard<OpenSides>[] = [
  { value: 1, title: '1 åben side (rækkestand)', description: 'Kun forsiden vender ud mod gangen. Billigst, fordi kun én side skal se færdig ud.' },
  { value: 2, title: '2 åbne sider (hjørnestand)', description: 'Står for enden af en række — to sider er synlige.' },
  { value: 3, title: '3 åbne sider (gavlstand)', description: 'Står for enden af en gang — tre sider er synlige.' },
  { value: 4, title: '4 åbne sider (ø-stand)', description: 'Fritstående og synlig fra alle sider. Mest synlighed, men dyrest.' },
]

const HANGING_SIGN_OPTIONS: OptionCard<YesNo>[] = [
  { value: 'no', title: 'Nej', description: 'Standen taler for sig selv.' },
  { value: 'yes', title: 'Ja', description: 'Logo/skilt hængt op over standen.' },
]

const FLOOR_OPTIONS: OptionCard<FloorChoice>[] = [
  { value: 'standard', title: 'Hallens standardgulv', description: 'Typisk gråt nålefilt-tæppe, allerede inkluderet i standlejen.' },
  { value: 'own', title: 'Eget gulv', description: 'Vinyl, træ eller et hævet gulv.' },
]

const OWN_FLOOR_OPTIONS: OptionCard<OwnFloorType>[] = [
  { value: 'vinyl', title: 'Vinylgulv', description: 'Tyndt og fleksibelt, mange farver og mønstre. Hurtigst at lægge og billigst af de tre.' },
  { value: 'wood', title: 'Trægulv', description: 'Ægte eller finér-lameller — varmt, indbydende udtryk. Mere tid at lægge, tungere at transportere.' },
  { value: 'raised', title: 'Hævet gulv (podium)', description: 'Løftes 5-15 cm over hallens gulv og skjuler kabler — kræver ramper ved indgange.' },
]

const PRODUCT_DISPLAY_OPTIONS: OptionCard<ProductDisplay>[] = [
  { value: 'shelves', title: 'Åbne hylder eller borde', description: 'Enkelt og tilgængeligt — gæster kan røre og udforske frit.' },
  { value: 'cases', title: 'Lukkede montrer/vitriner', description: 'Til skrøbelige eller værdifulde ting.' },
  { value: 'hanging', title: 'Hængende/ophængt', description: 'Fra væg eller loft.' },
  { value: 'live', title: 'Kører/fungerer live', description: 'Fx en maskine i drift.' },
]

const AUDIO_OPTIONS: OptionCard<AudioPresentation>[] = [
  { value: 'none', title: 'Nej, kun en-til-en samtaler', description: 'Ingen behov for lyd til grupper.' },
  { value: 'occasional', title: 'Af og til, for mindre grupper', description: 'Håndholdt mikrofon eller højtaler.' },
  { value: 'regular', title: 'Jævnligt, for større grupper', description: 'Fast lydanlæg og evt. scenebelysning.' },
]

const BUILD_HELP_OPTIONS: OptionCard<BuildHelp>[] = [
  { value: 'diy', title: 'Vi klarer det selv', description: 'I står for opbygning og nedtagning selv.' },
  { value: 'help', title: 'Ja, hjælp os hele vejen', description: 'Vores team opstiller og pakker ned på messen.' },
]

const CATERING_OPTIONS: OptionCard<CateringItem>[] = [
  { value: 'coffee', title: 'Kaffemaskine', description: 'Kræver strøm, nogle modeller også vandtilslutning.' },
  { value: 'fridge', title: 'Køleskab', description: 'Til kolde drikkevarer, kræver strøm.' },
  { value: 'wine_cooler', title: 'Vinkøler', description: 'Til vin/champagne, kræver strøm.' },
  { value: 'sink', title: 'Håndvask/opvaskeplads', description: 'Kræver vand- og afløbstilslutning fra hallen.' },
  { value: 'bar', title: 'Bardisk/udskænkningsdisk', description: 'Fast møbel til at servere fra.' },
]

// Hver undertekst er opdelt i tre dele, så den kan vises konsekvent på tværs
// af alle spørgsmål: `highlight` er nøgleordet/nøglesætningen (vises med
// grøn accentfarve, semibold), `rest` er resten af den korte primærsætning
// (dæmpet grå, maks. ca. 8-10 ord i alt), og `tooltip` er den fulde uddybning,
// som først vises når brugeren åbner "i"-ikonet.
const STEP_META: Record<CoreStepId, { title: string; highlight: string; rest: string; tooltip: string }> = {
  size: {
    title: 'Hvor stor skal jeres stand være?',
    highlight: 'Størrelsen',
    rest: 'er den største faktor i prisen.',
    tooltip: 'Både materialer og opbygningstid skalerer direkte med antal kvadratmeter.',
  },
  openSides: {
    title: 'Hvor mange sider skal være åbne?',
    highlight: 'Flere åbne sider',
    rest: 'betyder højere pris.',
    tooltip:
      'Jo flere sider gæster kan gå ind fra og se, jo flere flader skal fremstå helt færdige — det er det, der driver prisen.',
  },
  hangingSign: {
    title: 'Skal I have et hængeskilt?',
    highlight: 'Kræver særskilt godkendelse',
    rest: 'og rigging fra hallen.',
    tooltip:
      'Kræver særskilt godkendelse og rigging fra messehallen samt ekstra montagetid — men er ofte afgørende i store haller, hvor man ikke kan se standene fra gulvhøjde.',
  },
  floor: {
    title: 'Hvilket gulv skal standen have?',
    highlight: 'Standardgulvet',
    rest: 'er allerede inkluderet i lejen.',
    tooltip: 'Hallens eget gulv er inkluderet i lejen. Vælger I jeres eget, kan I style det præcis som I vil.',
  },
  floorType: {
    title: 'Hvilken type gulv skal I have?',
    highlight: 'Pris, udtryk og lægge-tid',
    rest: 'adskiller de tre typer.',
    tooltip: 'De tre typer adskiller sig på pris, udtryk og hvor lang tid de tager at lægge.',
  },
  productDisplay: {
    title: 'Hvordan skal gæster se jeres produkter?',
    highlight: 'Måden produkterne vises på',
    rest: 'påvirker indretning og udstyr.',
    tooltip: 'Måden produkterne vises på påvirker både indretning og hvilket udstyr standen skal bygges med.',
  },
  audioPresentation: {
    title: 'Skal I holde oplæg eller demoer for grupper?',
    highlight: 'Flere og større grupper',
    rest: 'kræver mere lydudstyr.',
    tooltip: 'Jo større og hyppigere gruppepræsentationer, jo mere lydudstyr skal standen bygges med.',
  },
  catering: {
    title: 'Skal standen have udstyr til forplejning?',
    highlight: 'Hvert stykke udstyr',
    rest: 'kræver egen tilslutning.',
    tooltip:
      'Hvert stykke udstyr lejes særskilt og skal tilsluttes strøm, vand eller afløb — jo flere I vælger, jo mere teknisk installation kræver standen. I kan vælge flere.',
  },
  buildHelp: {
    title: 'Klarer I opbygning og nedtagning selv, eller skal vi stå for det?',
    highlight: 'Vælger I hjælp,',
    rest: 'klarer vores team det hele.',
    tooltip:
      'Vælger I hjælp, klarer vores team det hele på messen. Vælger I selv, leverer vi standen klar til jeres eget team.',
  },
}

const defaultAnswers: ConfiguratorAnswers = {
  size: PRICING_CONFIG.defaultSize,
  openSides: 1,
  hangingSign: 'no',
  floor: 'standard',
  ownFloorType: 'vinyl',
  productDisplay: 'shelves',
  audioPresentation: 'none',
  catering: [],
  buildHelp: 'diy',
  insurance: 'no',
  storage: 'no',
  photography: 'no',
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-wieben-forest/70">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-wieben-mint-light">
        <div
          className="h-2 rounded-full bg-wieben-forest-light"
          style={{ width: `${pct}%`, transition: `width 320ms ${EASE_PREMIUM}` }}
        />
      </div>
    </div>
  )
}

// Trækbar m²-slider. Bygget med Pointer Events (dækker mus, touch og pen i
// ét), så håndtaget kan trækkes direkte i stedet for kun at klikke på et
// punkt. Egne hover/drag/release-tilstande giver diskrete mikroanimationer.
function DragSlider({
  min,
  max,
  value,
  onChange,
  ariaLabel,
}: {
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [justReleased, setJustReleased] = useState(false)
  const releaseTimeout = useRef<number | undefined>(undefined)

  const pct = ((value - min) / (max - min)) * 100

  const valueFromClientX = (clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return Math.round(min + fraction * (max - min))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    window.clearTimeout(releaseTimeout.current)
    setJustReleased(false)
    setDragging(true)
    onChange(valueFromClientX(e.clientX))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    onChange(valueFromClientX(e.clientX))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    setJustReleased(true)
    releaseTimeout.current = window.setTimeout(() => setJustReleased(false), 260)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      onChange(Math.min(max, value + step))
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      onChange(Math.max(min, value - step))
      e.preventDefault()
    } else if (e.key === 'Home') {
      onChange(min)
      e.preventDefault()
    } else if (e.key === 'End') {
      onChange(max)
      e.preventDefault()
    }
  }

  const thumbScale = dragging ? 1.22 : hovering ? 1.1 : 1
  const thumbTransitionDuration = dragging ? '80ms' : justReleased ? '360ms' : '150ms'
  const thumbTransitionEasing = dragging ? 'linear' : justReleased ? EASE_SETTLE : EASE_PREMIUM

  return (
    <div className="w-full max-w-md select-none">
      <div
        ref={trackRef}
        className="relative h-2.5 w-full touch-none rounded-full bg-wieben-mint-light"
        style={{ cursor: dragging ? 'grabbing' : 'pointer' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-wieben-forest-light"
          style={{ width: `${pct}%`, transition: dragging ? 'none' : `width 150ms ${EASE_PREMIUM}` }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="absolute top-1/2 h-[22px] w-[22px] rounded-full border-2 border-wieben-forest-light bg-white outline-none focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25"
          style={{
            left: `${pct}%`,
            transform: `translate(-50%, -50%) scale(${thumbScale})`,
            boxShadow: dragging ? '0 8px 20px -4px rgba(10,61,46,0.4)' : '0 2px 6px rgba(10,61,46,0.18)',
            transitionProperty: 'transform, box-shadow',
            transitionDuration: thumbTransitionDuration,
            transitionTimingFunction: thumbTransitionEasing,
          }}
        />
      </div>
    </div>
  )
}

// Skematisk ikon der viser hvilke sider af standen der er åbne (tynd,
// stiplet linje) versus lukket væg (tyk, hel linje). Farven arves fra
// forælderen via currentColor, så den følger kortets valgt/ikke-valgt-tilstand.
function OpenSidesIcon({ sides }: { sides: OpenSides }) {
  const closedSides: Record<OpenSides, ('top' | 'right' | 'bottom' | 'left')[]> = {
    1: ['top', 'left', 'right'],
    2: ['top', 'left'],
    3: ['top'],
    4: [],
  }
  const closed = closedSides[sides]
  const line = (side: 'top' | 'right' | 'bottom' | 'left') => {
    const isClosed = closed.includes(side)
    const coords: Record<typeof side, [number, number, number, number]> = {
      top: [6, 6, 34, 6],
      right: [34, 6, 34, 34],
      bottom: [6, 34, 34, 34],
      left: [6, 6, 6, 34],
    }
    const [x1, y1, x2, y2] = coords[side]
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={isClosed ? 3 : 1.5}
        strokeDasharray={isClosed ? undefined : '3 3'}
        strokeLinecap="round"
        opacity={isClosed ? 1 : 0.4}
      />
    )
  }
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      {line('top')}
      {line('right')}
      {line('bottom')}
      {line('left')}
    </svg>
  )
}

// Samme lille info-ikon foran undertekst på tværs af alle spørgsmål, så
// mønsteret er umiddelbart genkendeligt.
function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="6.4" r="1" fill="currentColor" />
      <line x1="10" y1="9.3" x2="10" y2="14.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Kort primærtekst (nøgleord fremhævet i grøn + kort dæmpet resttekst), med
// et "i"-ikon der kan klikkes for at folde den fulde uddybning ud. Bruges
// konsekvent af alle spørgsmål via QuestionShell.
function QuestionHint({ highlight, rest, tooltip }: { highlight: string; rest: string; tooltip: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2 max-w-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-start gap-2 rounded-md py-0.5 text-left outline-none focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25"
      >
        <span className="mt-0.5 shrink-0 text-wieben-forest-light">
          <InfoIcon />
        </span>
        <span className="text-[15px] leading-relaxed">
          <span className="font-semibold text-wieben-forest-light">{highlight}</span>{' '}
          <span className="text-wieben-forest/55">{rest}</span>
          <span className="ml-1.5 text-xs font-medium text-wieben-forest/35 underline decoration-dotted underline-offset-2 group-hover:text-wieben-forest/60">
            {open ? 'skjul' : 'læs mere'}
          </span>
        </span>
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity]"
        style={{
          maxHeight: open ? '160px' : '0px',
          opacity: open ? 1 : 0,
          transitionDuration: '300ms',
          transitionTimingFunction: EASE_PREMIUM,
        }}
      >
        <p className="mt-1.5 pl-6 text-sm leading-relaxed text-wieben-forest/60">{tooltip}</p>
      </div>
    </div>
  )
}

function QuestionShell({
  title,
  highlight,
  rest,
  tooltip,
  direction,
  children,
}: {
  title: string
  highlight: string
  rest: string
  tooltip: string
  direction: Direction
  children: React.ReactNode
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Flyt fokus til spørgsmålets overskrift, hver gang et nyt spørgsmål vises,
  // så brugeren (og skærmlæsere) altid ved hvor de er i flowet.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className={direction === 'forward' ? 'animate-step-in-forward' : 'animate-step-in-backward'}>
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-wieben-forest outline-none sm:text-3xl">
        {title}
      </h2>
      <QuestionHint highlight={highlight} rest={rest} tooltip={tooltip} />
      <div className="mt-8">{children}</div>
    </div>
  )
}

function OptionCards<T extends string | number>({
  options,
  selected,
  onSelect,
  renderIcon,
}: {
  options: OptionCard<T>[]
  selected: T
  onSelect: (value: T) => void
  renderIcon?: (value: T) => React.ReactNode
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => {
        const isSelected = opt.value === selected
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            style={{ transitionDuration: '180ms', transitionTimingFunction: EASE_PREMIUM }}
            className={`rounded-xl border-2 p-5 text-left transition-[border-color,background-color,box-shadow,transform] outline-none focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25 active:scale-[0.98] ${
              isSelected
                ? 'border-wieben-forest-light bg-wieben-mint-light shadow-[0_4px_16px_-4px_rgba(10,61,46,0.25)]'
                : 'border-wieben-forest/10 bg-white hover:-translate-y-0.5 hover:border-wieben-forest-light/40 hover:shadow-[0_8px_20px_-6px_rgba(10,61,46,0.18)]'
            }`}
          >
            {renderIcon && (
              <div className={isSelected ? 'mb-2 text-wieben-forest-light' : 'mb-2 text-wieben-forest/35'}>
                {renderIcon(opt.value)}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-wieben-forest">{opt.title}</span>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-wieben-forest-light text-xs text-white"
                style={{
                  opacity: isSelected ? 1 : 0,
                  transform: isSelected ? 'scale(1)' : 'scale(0.5)',
                  transition: `opacity 150ms ${EASE_PREMIUM}, transform 150ms ${EASE_PREMIUM}`,
                }}
              >
                ✓
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-wieben-forest/70">{opt.description}</p>
          </button>
        )
      })}
    </div>
  )
}

// Flervalgs-tjekliste (afkrydsningsfelter, ikke enkeltvalgs-knapper) —
// firkantet indikator i stedet for den runde fra OptionCards, så det visuelt
// er tydeligt at flere kan vælges på samme tid.
function CheckboxCards({
  options,
  selected,
  onToggle,
}: {
  options: OptionCard<CateringItem>[]
  selected: CateringItem[]
  onToggle: (value: CateringItem) => void
}) {
  // Når antallet af muligheder er ulige, ender det sidste kort alene i sidste
  // række af 2-kolonne-gitteret og bliver kun halvt så bredt som resten, med
  // et akavet tomt hul ved siden af — så det sidste kort spænder over begge
  // kolonner i stedet.
  const isLoneLastItem = options.length % 2 === 1

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((opt, i) => {
        const isChecked = selected.includes(opt.value)
        const spanFull = isLoneLastItem && i === options.length - 1
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={isChecked}
            onClick={() => onToggle(opt.value)}
            style={{ transitionDuration: '180ms', transitionTimingFunction: EASE_PREMIUM }}
            className={`rounded-xl border-2 p-5 text-left transition-[border-color,background-color,box-shadow,transform] outline-none focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25 active:scale-[0.98] ${
              spanFull ? 'sm:col-span-2' : ''
            } ${
              isChecked
                ? 'border-wieben-forest-light bg-wieben-mint-light shadow-[0_4px_16px_-4px_rgba(10,61,46,0.25)]'
                : 'border-wieben-forest/10 bg-white hover:-translate-y-0.5 hover:border-wieben-forest-light/40 hover:shadow-[0_8px_20px_-6px_rgba(10,61,46,0.18)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 text-xs text-white transition-colors ${
                  isChecked ? 'border-wieben-forest-light bg-wieben-forest-light' : 'border-wieben-forest/25 bg-white'
                }`}
              >
                {isChecked && '✓'}
              </span>
              <span className="font-semibold text-wieben-forest">{opt.title}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-wieben-forest/70">{opt.description}</p>
          </button>
        )
      })}
    </div>
  )
}

// Rent visuel — selve klikket/tastaturhåndteringen sidder på hele kortet i
// UpsellToggle, så hit-target er hele rækken og ikke kun den lille kontakt.
// checked === true er den ENESTE kilde til grøn/aktiv styling — både kortets
// kant/baggrund, ikon-badge og selve kontakten læser samme boolean, så de
// aldrig kan komme ud af sync med hinanden.
function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ transitionTimingFunction: EASE_PREMIUM }}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-wieben-forest-light' : 'bg-gray-300'
      }`}
    >
      <span
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(23px)' : 'translateX(4px)', transitionTimingFunction: EASE_SETTLE }}
      />
    </span>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 8.5v9a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 12.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function UpsellIconBadge({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{ transitionTimingFunction: EASE_PREMIUM }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
        checked ? 'bg-wieben-forest-light text-white' : 'bg-wieben-forest/8 text-wieben-forest/45'
      }`}
    >
      {children}
    </span>
  )
}

function UpsellToggle({
  icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      style={{ transitionDuration: '200ms', transitionTimingFunction: EASE_PREMIUM }}
      className={`flex w-full items-start justify-between gap-4 rounded-2xl border-2 p-5 text-left outline-none transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25 ${
        checked
          ? 'border-wieben-forest-light bg-wieben-mint-light shadow-[0_10px_28px_-10px_rgba(10,61,46,0.3)]'
          : 'border-gray-200 bg-white shadow-sm hover:border-wieben-forest-light/30 hover:shadow-[0_10px_24px_-10px_rgba(10,61,46,0.15)]'
      }`}
    >
      <div className="flex items-start gap-4">
        <UpsellIconBadge checked={checked}>{icon}</UpsellIconBadge>
        <div>
          <p className="font-semibold text-wieben-forest">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-wieben-forest/70">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} />
    </button>
  )
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Næste',
  backDisabled = false,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  backDisabled?: boolean
}) {
  return (
    <div className="mt-10 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        className="rounded-md px-2 py-2 text-[15px] font-medium text-wieben-forest/60 outline-none transition-colors duration-150 hover:text-wieben-forest focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25 disabled:invisible"
      >
        ← Tilbage
      </button>
      <button
        type="button"
        onClick={onNext}
        style={{ transitionDuration: '180ms', transitionTimingFunction: EASE_PREMIUM }}
        className="rounded-md bg-wieben-forest-light px-6 py-3 text-[15px] font-semibold text-white shadow-sm outline-none transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-wieben-forest hover:shadow-md focus-visible:ring-4 focus-visible:ring-wieben-forest-light/30 active:translate-y-0 active:scale-[0.98]"
      >
        {nextLabel}
      </button>
    </div>
  )
}

// Kort, rolig "success"-animation mellem tilvalg og den endelige
// opsummering — cirklen tegner sig, så fluebenet. Ren CSS (stroke-dasharray/
// -dashoffset), ingen konfetti/emoji, for at holde tonen professionel over
// for en B2B-målgruppe.
function SuccessCheckmark() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <svg width="88" height="88" viewBox="0 0 88 88" className="text-wieben-forest-light" aria-hidden="true">
        <circle cx="44" cy="44" r="40" fill="none" stroke="currentColor" strokeWidth="4" className="draw-circle" />
        <path
          d="M27 45 L39 57 L61 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="draw-check"
        />
      </svg>
      <p className="text-base font-semibold text-wieben-forest">Jeres estimat er klar</p>
    </div>
  )
}

const CATEGORY_ORDER: PriceCategory[] = ['construction', 'layout', 'tech', 'catering', 'upsell']

// Prisfordeling som donut-diagram — supplerer tekst-nedbrydningen, erstatter
// den ikke. Bygget som "stroke-dasharray"-donut af stablede cirkel-segmenter,
// så det ikke kræver noget diagram-bibliotek.
function CategoryDonutChart({ lines, total }: { lines: ReturnType<typeof calculatePrice>['lines']; total: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius

  const segments = CATEGORY_ORDER.map((cat) => {
    const amount = lines.filter((l) => l.category === cat).reduce((sum, l) => sum + l.amount, 0)
    return { category: cat, amount }
  }).filter((s) => s.amount > 0)

  if (total <= 0 || segments.length === 0) return null

  let offsetSoFar = 0

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0" role="img" aria-label="Prisfordeling pr. kategori">
        <g transform="rotate(-90 90 90)">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--color-wieben-mint-light)" strokeWidth="22" />
          {segments.map((seg) => {
            const length = (seg.amount / total) * circumference
            const dasharray = `${length} ${circumference - length}`
            const dashoffset = -offsetSoFar
            offsetSoFar += length
            return (
              <circle
                key={seg.category}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={CATEGORY_META[seg.category].color}
                strokeWidth="22"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                style={{ transition: `stroke-dasharray 500ms ${EASE_PREMIUM}` }}
              />
            )
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" className="fill-wieben-forest" style={{ font: '700 15px Inter, sans-serif' }}>
          {formatKr(total)}
        </text>
        <text
          x="90"
          y="103"
          textAnchor="middle"
          className="fill-wieben-forest/50"
          style={{ font: '600 9.5px Inter, sans-serif', letterSpacing: '0.04em' }}
        >
          I ALT
        </text>
      </svg>

      <ul className="flex w-full flex-col gap-2.5">
        {segments.map((seg) => {
          const pct = Math.round((seg.amount / total) * 100)
          return (
            <li key={seg.category} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2.5 text-wieben-forest">
                <span
                  className="h-3 w-3 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: CATEGORY_META[seg.category].color }}
                  aria-hidden="true"
                />
                {CATEGORY_META[seg.category].label}
              </span>
              <span className="whitespace-nowrap font-semibold tabular-nums text-wieben-forest">
                {pct}% · {formatKr(seg.amount)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function PriceConfigurator() {
  const [phase, setPhase] = useState<Phase>('questions')
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<Direction>('forward')
  const [answers, setAnswers] = useState<ConfiguratorAnswers>(defaultAnswers)
  const [submitted, setSubmitted] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })

  const coreSteps = getCoreSteps(answers)
  const totalSteps = coreSteps.length + 1 // +1 = tilvalgs-skærmen

  const update = <K extends keyof ConfiguratorAnswers>(key: K, value: ConfiguratorAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }))

  const toggleCatering = (item: CateringItem) =>
    setAnswers((prev) => ({
      ...prev,
      catering: prev.catering.includes(item) ? prev.catering.filter((i) => i !== item) : [...prev.catering, item],
    }))

  const goNext = () => {
    setDirection('forward')
    if (phase === 'questions') {
      if (step >= coreSteps.length - 1) {
        setPhase('upsell')
      } else {
        setStep((s) => s + 1)
      }
    } else if (phase === 'upsell') {
      // En kort "success"-animation inden selve opsummeringen — springes over
      // hvis brugeren har bedt om reduceret bevægelse.
      setPhase(prefersReducedMotion() ? 'summary' : 'success')
    }
  }

  const goBack = () => {
    setDirection('backward')
    if (phase === 'summary') {
      setPhase('upsell')
    } else if (phase === 'upsell') {
      setPhase('questions')
      setStep(coreSteps.length - 1)
    } else if (step > 0) {
      setStep((s) => s - 1)
    }
  }

  // "success"-fasen er transitorisk og går automatisk videre til opsummeringen.
  useEffect(() => {
    if (phase !== 'success') return
    const timer = window.setTimeout(() => setPhase('summary'), 1000)
    return () => window.clearTimeout(timer)
  }, [phase])

  const price = calculatePrice(answers)

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault()
    // I en rigtig version sendes dette til CRM/backend sammen med hele
    // konfigurationen (answers) for automatisk opfølgning.
    console.log('Simuleret CRM-lead:', { contact, answers, price })
    setSubmitted(true)
  }

  const currentStepId = coreSteps[step]

  return (
    <section id="konfigurator" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {(phase === 'questions' || phase === 'upsell') && <LivePriceTicker low={price.low} high={price.high} />}
      <div className="overflow-hidden rounded-2xl border border-wieben-forest/10 bg-white p-6 shadow-sm sm:p-10">
        {phase === 'questions' && (
          <ProgressBar
            pct={Math.round(((step + 1) / totalSteps) * 100)}
            label={`Spørgsmål ${step + 1} af ${totalSteps}`}
          />
        )}
        {phase === 'upsell' && (
          <ProgressBar pct={Math.round((coreSteps.length / totalSteps) * 100)} label="Tilvalg" />
        )}

        {phase === 'questions' && currentStepId === 'size' && (
          <QuestionShell direction={direction} title={STEP_META.size.title} highlight={STEP_META.size.highlight} rest={STEP_META.size.rest} tooltip={STEP_META.size.tooltip}>
            <div className="flex flex-col items-center gap-5">
              <div className="text-4xl font-bold tabular-nums text-wieben-forest">{answers.size} m²</div>
              <DragSlider
                min={PRICING_CONFIG.minSize}
                max={PRICING_CONFIG.maxSize}
                value={answers.size}
                onChange={(v) => update('size', v)}
                ariaLabel="Standstørrelse i kvadratmeter"
              />
              <div className="flex w-full max-w-md justify-between text-xs tabular-nums text-wieben-forest/50">
                <span>{PRICING_CONFIG.minSize} m²</span>
                <span>{PRICING_CONFIG.maxSize} m²</span>
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} backDisabled />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'openSides' && (
          <QuestionShell direction={direction} title={STEP_META.openSides.title} highlight={STEP_META.openSides.highlight} rest={STEP_META.openSides.rest} tooltip={STEP_META.openSides.tooltip}>
            <OptionCards
              options={OPEN_SIDES_OPTIONS}
              selected={answers.openSides}
              onSelect={(v) => update('openSides', v)}
              renderIcon={(v) => <OpenSidesIcon sides={v} />}
            />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'hangingSign' && (
          <QuestionShell direction={direction} title={STEP_META.hangingSign.title} highlight={STEP_META.hangingSign.highlight} rest={STEP_META.hangingSign.rest} tooltip={STEP_META.hangingSign.tooltip}>
            <OptionCards options={HANGING_SIGN_OPTIONS} selected={answers.hangingSign} onSelect={(v) => update('hangingSign', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'floor' && (
          <QuestionShell direction={direction} title={STEP_META.floor.title} highlight={STEP_META.floor.highlight} rest={STEP_META.floor.rest} tooltip={STEP_META.floor.tooltip}>
            <OptionCards options={FLOOR_OPTIONS} selected={answers.floor} onSelect={(v) => update('floor', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'floorType' && (
          <QuestionShell direction={direction} title={STEP_META.floorType.title} highlight={STEP_META.floorType.highlight} rest={STEP_META.floorType.rest} tooltip={STEP_META.floorType.tooltip}>
            <OptionCards options={OWN_FLOOR_OPTIONS} selected={answers.ownFloorType} onSelect={(v) => update('ownFloorType', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'productDisplay' && (
          <QuestionShell direction={direction} title={STEP_META.productDisplay.title} highlight={STEP_META.productDisplay.highlight} rest={STEP_META.productDisplay.rest} tooltip={STEP_META.productDisplay.tooltip}>
            <OptionCards options={PRODUCT_DISPLAY_OPTIONS} selected={answers.productDisplay} onSelect={(v) => update('productDisplay', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'audioPresentation' && (
          <QuestionShell direction={direction} title={STEP_META.audioPresentation.title} highlight={STEP_META.audioPresentation.highlight} rest={STEP_META.audioPresentation.rest} tooltip={STEP_META.audioPresentation.tooltip}>
            <OptionCards options={AUDIO_OPTIONS} selected={answers.audioPresentation} onSelect={(v) => update('audioPresentation', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'catering' && (
          <QuestionShell direction={direction} title={STEP_META.catering.title} highlight={STEP_META.catering.highlight} rest={STEP_META.catering.rest} tooltip={STEP_META.catering.tooltip}>
            <CheckboxCards options={CATERING_OPTIONS} selected={answers.catering} onToggle={toggleCatering} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {phase === 'questions' && currentStepId === 'buildHelp' && (
          <QuestionShell direction={direction} title={STEP_META.buildHelp.title} highlight={STEP_META.buildHelp.highlight} rest={STEP_META.buildHelp.rest} tooltip={STEP_META.buildHelp.tooltip}>
            <OptionCards options={BUILD_HELP_OPTIONS} selected={answers.buildHelp} onSelect={(v) => update('buildHelp', v)} />
            <NavButtons onBack={goBack} onNext={goNext} nextLabel="Se tilvalg" />
          </QuestionShell>
        )}

        {phase === 'upsell' && (
          <div className={direction === 'forward' ? 'animate-step-in-forward' : 'animate-step-in-backward'}>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-wieben-mint-light px-3 py-1 text-xs font-semibold text-wieben-forest-light">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 8.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Kernevalg gennemført
            </div>
            <h2 className="text-2xl font-bold text-wieben-forest sm:text-3xl">Valgfrie tilføjelser</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-wieben-forest/70">
              Det her er helt valgfrit og lægges oveni grundprisen — spring roligt over, hvis I ikke har brug for det.
            </p>
            <div className="mt-8 flex flex-col gap-5">
              <UpsellToggle
                icon={<ShieldIcon />}
                title="Messeforsikring"
                description="Sikrer jer mod skader, tyveri eller brand på standen under opstilling og messe. Har I allerede jeres egen dækning, er det helt fint at sige nej."
                checked={answers.insurance === 'yes'}
                onToggle={() => update('insurance', answers.insurance === 'yes' ? 'no' : 'yes')}
              />
              <UpsellToggle
                icon={<ArchiveIcon />}
                title="Opbevaring mellem messer"
                description="Vi opbevarer standen på vores lager, til I skal bruge den igen — praktisk hvis den skal ud og stå flere gange."
                checked={answers.storage === 'yes'}
                onToggle={() => update('storage', answers.storage === 'yes' ? 'no' : 'yes')}
              />
              <UpsellToggle
                icon={<CameraIcon />}
                title="Professionel fotopakke"
                description="Vi tager billeder af den færdige stand, som I kan bruge i jeres egen markedsføring bagefter."
                checked={answers.photography === 'yes'}
                onToggle={() => update('photography', answers.photography === 'yes' ? 'no' : 'yes')}
              />
            </div>
            <NavButtons onBack={goBack} onNext={goNext} nextLabel="Se dit prisestimat" />
          </div>
        )}

        {phase === 'success' && <SuccessCheckmark />}

        {phase === 'summary' && (
          <Summary
            direction={direction}
            answers={answers}
            price={price}
            onBack={goBack}
            contact={contact}
            setContact={setContact}
            submitted={submitted}
            onSubmit={handleSubmitContact}
          />
        )}
      </div>
    </section>
  )
}

const openSidesSentenceLabel: Record<OpenSides, string> = {
  1: 'rækkestand',
  2: 'hjørnestand',
  3: 'gavlstand',
  4: 'ø-stand',
}
const productDisplaySentenceLabel: Record<ProductDisplay, string> = {
  shelves: 'åbne hylder og borde',
  cases: 'lukkede montrer',
  hanging: 'ophængt fremvisning',
  live: 'et live-kørende produkt',
}
const buildHelpSentenceLabel: Record<BuildHelp, string> = {
  help: 'med hjælp fra os til opbygning og nedtagning',
  diy: 'hvor I selv står for opbygning og nedtagning',
}
const ownFloorSentenceLabel: Record<OwnFloorType, string> = {
  vinyl: 'eget vinylgulv',
  wood: 'eget trægulv',
  raised: 'et hævet podium-gulv',
}

function Summary({
  direction,
  answers,
  price,
  onBack,
  contact,
  setContact,
  submitted,
  onSubmit,
}: {
  direction: Direction
  answers: ConfiguratorAnswers
  price: ReturnType<typeof calculatePrice>
  onBack: () => void
  contact: { name: string; email: string; phone: string }
  setContact: (c: { name: string; email: string; phone: string }) => void
  submitted: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  const headingRef = useRef<HTMLParagraphElement>(null)
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const floorPhrase = answers.floor === 'standard' ? 'hallens standardgulv' : ownFloorSentenceLabel[answers.ownFloorType]
  const summarySentence = `I får en ${answers.size} m² ${openSidesSentenceLabel[answers.openSides]} med ${floorPhrase}, hvor gæster ser jeres produkter via ${productDisplaySentenceLabel[answers.productDisplay]}, ${buildHelpSentenceLabel[answers.buildHelp]}.`

  const coreLines = price.lines.filter((l) => l.kind === 'core')
  const upsellLines = price.lines.filter((l) => l.kind === 'upsell')

  const handleDownloadPdf = async () => {
    setPdfStatus('loading')
    try {
      await generateSummaryPdf({ answers, price, summarySentence, contact })
      setPdfStatus('idle')
    } catch (err) {
      console.error('Kunne ikke generere PDF', err)
      setPdfStatus('error')
    }
  }

  return (
    <div className={direction === 'forward' ? 'animate-step-in-forward' : 'animate-step-in-backward'}>
      <p
        ref={headingRef}
        tabIndex={-1}
        className="text-sm font-semibold uppercase tracking-wide text-wieben-forest-light outline-none"
      >
        Jeres prisestimat
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold tabular-nums text-wieben-forest sm:text-4xl">
          {formatKr(price.low)} – {formatKr(price.high)}
        </span>
        <span className="text-sm text-wieben-forest/60">ekskl. moms</span>
      </div>
      <p className="mt-2 text-sm text-wieben-forest/60">
        Dette er et estimat baseret på jeres valg — det endelige tilbud kan afvige lidt, når vi kender alle detaljer.
      </p>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfStatus === 'loading'}
          className="inline-flex items-center gap-2 rounded-md border-2 border-wieben-forest/15 bg-white px-4 py-2 text-sm font-semibold text-wieben-forest outline-none transition-colors duration-150 hover:border-wieben-forest-light/40 hover:bg-wieben-cream focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25 disabled:opacity-60"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3v12m0 0l-5-5m5 5l5-5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {pdfStatus === 'loading' ? 'Genererer PDF…' : 'Download som PDF'}
        </button>
        {pdfStatus === 'error' && (
          <p className="mt-2 text-sm text-red-600">Der gik noget galt — prøv at downloade PDF'en igen.</p>
        )}
      </div>

      <p className="mt-6 rounded-lg bg-wieben-mint-light p-4 text-[15px] leading-relaxed text-wieben-forest">
        {summarySentence}
      </p>

      <h3 className="mt-8 mb-4 text-base font-semibold text-wieben-forest">Prisfordeling</h3>
      <div className="rounded-lg border border-wieben-forest/10 p-5">
        <CategoryDonutChart lines={price.lines} total={price.total} />
      </div>

      <h3 className="mt-8 mb-3 text-base font-semibold text-wieben-forest">Grundpris og valg</h3>
      <ul className="divide-y divide-wieben-forest/10 overflow-hidden rounded-lg border border-wieben-forest/10">
        {coreLines.map((line) => (
          <li
            key={line.label}
            className="flex items-start justify-between gap-4 p-4 transition-colors duration-150 hover:bg-wieben-cream"
          >
            <div>
              <p className="text-[15px] font-medium text-wieben-forest">{line.label}</p>
              <p className="mt-0.5 text-sm text-wieben-forest/60">{line.description}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-wieben-forest">
              +{formatKr(line.amount)}
            </span>
          </li>
        ))}
      </ul>

      {upsellLines.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-base font-semibold text-wieben-forest">Tilvalg</h3>
          <ul className="divide-y divide-wieben-forest/10 overflow-hidden rounded-lg border border-wieben-forest/10">
            {upsellLines.map((line) => (
              <li
                key={line.label}
                className="flex items-start justify-between gap-4 bg-wieben-mint-light/30 p-4 transition-colors duration-150 hover:bg-wieben-mint-light"
              >
                <div>
                  <p className="text-[15px] font-medium text-wieben-forest">{line.label}</p>
                  <p className="mt-0.5 text-sm text-wieben-forest/60">{line.description}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-wieben-forest">
                  +{formatKr(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!submitted ? (
        <form onSubmit={onSubmit} className="mt-10 border-t border-wieben-forest/10 pt-8">
          <h3 className="text-base font-semibold text-wieben-forest">Book en uforpligtende samtale</h3>
          <p className="mt-1 text-sm text-wieben-forest/60">
            Efterlad jeres kontaktoplysninger, så tager vi udgangspunkt i denne opsummering, når vi ringer op.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              required
              type="text"
              placeholder="Navn"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              className="rounded-md border border-wieben-forest/20 px-3 py-2 text-[15px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-wieben-forest-light focus:ring-4 focus:ring-wieben-forest-light/15"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="rounded-md border border-wieben-forest/20 px-3 py-2 text-[15px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-wieben-forest-light focus:ring-4 focus:ring-wieben-forest-light/15"
            />
            <input
              type="tel"
              placeholder="Telefon (valgfrit)"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="rounded-md border border-wieben-forest/20 px-3 py-2 text-[15px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-wieben-forest-light focus:ring-4 focus:ring-wieben-forest-light/15"
            />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="rounded-md px-2 py-2 text-[15px] font-medium text-wieben-forest/60 outline-none transition-colors duration-150 hover:text-wieben-forest focus-visible:ring-4 focus-visible:ring-wieben-forest-light/25"
            >
              ← Tilbage
            </button>
            <button
              type="submit"
              style={{ transitionDuration: '180ms', transitionTimingFunction: EASE_PREMIUM }}
              className="rounded-md bg-wieben-forest-light px-6 py-3 text-[15px] font-semibold text-white shadow-sm outline-none transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-wieben-forest hover:shadow-md focus-visible:ring-4 focus-visible:ring-wieben-forest-light/30 active:translate-y-0 active:scale-[0.98]"
            >
              Send os din opsummering
            </button>
          </div>
        </form>
      ) : (
        <div className="animate-step-in-forward mt-10 rounded-lg border border-wieben-forest-light/30 bg-wieben-mint-light p-5 text-center">
          <p className="font-semibold text-wieben-forest">Tak, {contact.name.split(' ')[0] || 'der'}! 🎉</p>
          <p className="mt-1 text-sm text-wieben-forest/70">
            Vi har modtaget jeres opsummering og ringer op inden for 1-2 hverdage.
          </p>
        </div>
      )}
    </div>
  )
}
