import { useEffect, useRef, useState } from 'react'
import {
  PRICING_CONFIG,
  calculatePrice,
  type BuildHelp,
  type Complexity,
  type ConfiguratorAnswers,
  type Frequency,
  type Location,
  type Ownership,
  type StandType,
  type Timeframe,
} from '../pricing/config'

// Simple, DKK-formatteret visning uden decimaler
const formatKr = (n: number) => `${n.toLocaleString('da-DK')} kr.`

const TOTAL_QUESTIONS = 8

// Delt easing-kurve for et roligt, "premium" bevægelsesmønster på tværs af
// hele konfiguratoren (progress-bar, trin-skift, knapper, kort).
const EASE_PREMIUM = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EASE_SETTLE = 'cubic-bezier(0.34, 1.56, 0.64, 1)' // let "overshoot" til release-animationer

type Direction = 'forward' | 'backward'

type OptionCard<T extends string> = {
  value: T
  title: string
  description: string
}

const STAND_TYPES: OptionCard<StandType>[] = [
  { value: 'system', title: 'Systemstand', description: 'Hurtig, genanvendelig og økonomisk. Godt førstevalg.' },
  { value: 'hybrid', title: 'Hybrid', description: 'Systemelementer kombineret med custom-detaljer.' },
  { value: 'custom', title: 'Skræddersyet', description: 'Snedkerbygget og unik. Dyrere og længere produktionstid.' },
]

const OWNERSHIP_OPTIONS: OptionCard<Ownership>[] = [
  { value: 'rent', title: 'Leje', description: 'Billigst første gang, men ingen gensalgsværdi bagefter.' },
  { value: 'buy', title: 'Køb', description: 'Dyrere pr. gang, men billigere i det lange løb ved flere messer.' },
]

const FREQUENCY_OPTIONS: OptionCard<Frequency>[] = [
  { value: 'once', title: '1 gang', description: 'Standen skal kun bruges til én enkelt messe.' },
  { value: 'few', title: '2-4 gange årligt', description: 'Standen genbruges et par gange om året.' },
  { value: 'rotation', title: 'Fast rotation', description: 'Standen indgår i en fast messekalender år efter år.' },
]

const COMPLEXITY_OPTIONS: OptionCard<Complexity>[] = [
  { value: 'simple', title: 'Enkelt og rent', description: 'Rene linjer, minimal detaljering.' },
  { value: 'medium', title: 'Mellem', description: 'Et par specialelementer, fx let belysning eller grafik.' },
  {
    value: 'advanced',
    title: 'Avanceret',
    description: 'Podier, lyskasser, integrerede skærme og møbler.',
  },
]

const LOCATION_OPTIONS: OptionCard<Location>[] = [
  { value: 'dk', title: 'Danmark', description: 'Ingen ekstra transport eller international koordinering.' },
  { value: 'europe', title: 'Europa', description: 'Kræver transport og lidt mere logistik.' },
  { value: 'world', title: 'Uden for Europa', description: 'Længst transport og lokal montage-koordinering.' },
]

const TIMEFRAME_OPTIONS: OptionCard<Timeframe>[] = [
  { value: 'long', title: 'Mere end 3 måneder', description: 'God tid — ingen rush-tillæg.' },
  { value: 'medium', title: '1-3 måneder', description: 'Stadig fint, men produktionen presses lidt.' },
  { value: 'short', title: 'Under 1 måned', description: 'Kræver prioriteret produktion i værkstedet.' },
]

const BUILD_HELP_OPTIONS: OptionCard<BuildHelp>[] = [
  { value: 'help', title: 'Ja, hjælp os hele vejen', description: 'Vores team opstiller og pakker ned på messen.' },
  { value: 'diy', title: 'Vi klarer det selv', description: 'I står for opbygning og nedtagning selv.' },
]

const defaultAnswers: ConfiguratorAnswers = {
  size: PRICING_CONFIG.defaultSize,
  standType: 'system',
  ownership: 'rent',
  frequency: 'once',
  complexity: 'simple',
  location: 'dk',
  timeframe: 'long',
  buildHelp: 'diy',
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_QUESTIONS) * 100)
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-wieben-forest/70">
        <span className="tabular-nums">
          Spørgsmål {Math.min(step + 1, TOTAL_QUESTIONS)} af {TOTAL_QUESTIONS}
        </span>
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

function QuestionShell({
  title,
  helpText,
  direction,
  children,
}: {
  title: string
  helpText: string
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
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-wieben-forest/70">{helpText}</p>
      <div className="mt-8">{children}</div>
    </div>
  )
}

function OptionCards<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: OptionCard<T>[]
  selected: T
  onSelect: (value: T) => void
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

export default function PriceConfigurator() {
  const [step, setStep] = useState(0) // 0-7 = spørgsmål, 8 = opsummering
  const [direction, setDirection] = useState<Direction>('forward')
  const [answers, setAnswers] = useState<ConfiguratorAnswers>(defaultAnswers)
  const [submitted, setSubmitted] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })

  const update = <K extends keyof ConfiguratorAnswers>(key: K, value: ConfiguratorAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }))

  const goNext = () => {
    setDirection('forward')
    setStep((s) => Math.min(s + 1, TOTAL_QUESTIONS))
  }
  const goBack = () => {
    setDirection('backward')
    setStep((s) => Math.max(s - 1, 0))
  }

  const price = calculatePrice(answers)

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault()
    // I en rigtig version sendes dette til CRM/backend sammen med hele
    // konfigurationen (answers) for automatisk opfølgning.
    console.log('Simuleret CRM-lead:', { contact, answers, price })
    setSubmitted(true)
  }

  return (
    <section id="konfigurator" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-wieben-forest/10 bg-white p-6 shadow-sm sm:p-10">
        {step < TOTAL_QUESTIONS && <ProgressBar step={step} />}

        {step === 0 && (
          <QuestionShell
            direction={direction}
            title="Hvor stor skal jeres stand være?"
            helpText="Størrelsen er den største enkeltfaktor i prisen — både materialer og opbygningstid skalerer direkte med kvadratmeter."
          >
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

        {step === 1 && (
          <QuestionShell
            direction={direction}
            title="Hvilken type stand passer bedst?"
            helpText="Systemstande er hurtige og økonomiske, skræddersyede stande er unikke men dyrere med længere produktionstid, og hybrid er det bedste fra begge verdener."
          >
            <OptionCards options={STAND_TYPES} selected={answers.standType} onSelect={(v) => update('standType', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 2 && (
          <QuestionShell
            direction={direction}
            title="Skal I købe eller leje standen?"
            helpText="Køb koster mere pr. gang, men bliver billigere over flere messer. Leje er billigst første gang, men giver ingen gensalgsværdi."
          >
            <OptionCards options={OWNERSHIP_OPTIONS} selected={answers.ownership} onSelect={(v) => update('ownership', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 3 && (
          <QuestionShell
            direction={direction}
            title="Hvor mange gange skal standen bruges?"
            helpText="Dette påvirker om køb eller leje bedst kan betale sig, og om standen skal bygges til nem opbevaring og genopstilling."
          >
            <OptionCards options={FREQUENCY_OPTIONS} selected={answers.frequency} onSelect={(v) => update('frequency', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 4 && (
          <QuestionShell
            direction={direction}
            title="Hvor avanceret skal designet være?"
            helpText="Hver ekstra funktion — podier, lyskasser, skærme, møbler — tilføjer design- og produktionstid."
          >
            <OptionCards options={COMPLEXITY_OPTIONS} selected={answers.complexity} onSelect={(v) => update('complexity', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 5 && (
          <QuestionShell
            direction={direction}
            title="Hvor skal messen holdes?"
            helpText="Transport og opbygningslogistik stiger med afstanden, og internationale messer kræver ofte lokal montage-koordinering."
          >
            <OptionCards options={LOCATION_OPTIONS} selected={answers.location} onSelect={(v) => update('location', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 6 && (
          <QuestionShell
            direction={direction}
            title="Hvor lang tid er der til messen?"
            helpText="Kort tidsramme kan kræve prioriteret produktion, hvilket typisk lægger et tillæg på prisen."
          >
            <OptionCards options={TIMEFRAME_OPTIONS} selected={answers.timeframe} onSelect={(v) => update('timeframe', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 7 && (
          <QuestionShell
            direction={direction}
            title="Skal vi hjælpe med opbygning og nedtagning?"
            helpText="Vælger I hjælp, klarer vores team det hele på messen. Vælger I selv, leverer vi standen klar til jeres eget team."
          >
            <OptionCards options={BUILD_HELP_OPTIONS} selected={answers.buildHelp} onSelect={(v) => update('buildHelp', v)} />
            <NavButtons onBack={goBack} onNext={goNext} nextLabel="Se dit prisestimat" />
          </QuestionShell>
        )}

        {step === TOTAL_QUESTIONS && (
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

const standTypeLabel: Record<StandType, string> = {
  system: 'systemstand',
  hybrid: 'hybridstand',
  custom: 'skræddersyet stand',
}
const locationLabel: Record<Location, string> = {
  dk: 'i Danmark',
  europe: 'i Europa',
  world: 'uden for Europa',
}
const frequencyLabel: Record<Frequency, string> = {
  once: 'til én messe',
  few: 'til brug flere gange om året',
  rotation: 'til fast rotation på jeres messer',
}
const buildHelpLabel: Record<BuildHelp, string> = {
  help: 'med hjælp til opbygning og nedtagning',
  diy: 'hvor I selv står for opbygning og nedtagning',
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

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const summarySentence = `I får en ${answers.size} m² ${standTypeLabel[answers.standType]} ${locationLabel[answers.location]}, ${frequencyLabel[answers.frequency]}, ${buildHelpLabel[answers.buildHelp]}.`

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

      <p className="mt-6 rounded-lg bg-wieben-mint-light p-4 text-[15px] leading-relaxed text-wieben-forest">
        {summarySentence}
      </p>

      <h3 className="mt-8 mb-3 text-base font-semibold text-wieben-forest">Sådan er prisen sat sammen</h3>
      <ul className="divide-y divide-wieben-forest/10 overflow-hidden rounded-lg border border-wieben-forest/10">
        {price.lines.map((line) => (
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
