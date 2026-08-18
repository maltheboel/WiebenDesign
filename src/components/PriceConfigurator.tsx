import { useState } from 'react'
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
        <span>
          Spørgsmål {Math.min(step + 1, TOTAL_QUESTIONS)} af {TOTAL_QUESTIONS}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-wieben-mint-light">
        <div
          className="h-2 rounded-full bg-wieben-forest-light transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function QuestionShell({
  title,
  helpText,
  children,
}: {
  title: string
  helpText: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-wieben-forest sm:text-3xl">{title}</h2>
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
            className={`rounded-xl border-2 p-5 text-left transition-all ${
              isSelected
                ? 'border-wieben-forest-light bg-wieben-mint-light shadow-md'
                : 'border-wieben-forest/10 bg-white hover:border-wieben-forest-light/40 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-wieben-forest">{opt.title}</span>
              {isSelected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-wieben-forest-light text-xs text-white">
                  ✓
                </span>
              )}
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
        className="text-[15px] font-medium text-wieben-forest/60 hover:text-wieben-forest disabled:invisible"
      >
        ← Tilbage
      </button>
      <button
        type="button"
        onClick={onNext}
        className="rounded-md bg-wieben-forest-light px-6 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-wieben-forest transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  )
}

export default function PriceConfigurator() {
  const [step, setStep] = useState(0) // 0-7 = spørgsmål, 8 = opsummering
  const [answers, setAnswers] = useState<ConfiguratorAnswers>(defaultAnswers)
  const [submitted, setSubmitted] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })

  const update = <K extends keyof ConfiguratorAnswers>(key: K, value: ConfiguratorAnswers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }))

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_QUESTIONS))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

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
      <div className="rounded-2xl border border-wieben-forest/10 bg-white p-6 shadow-sm sm:p-10">
        {step < TOTAL_QUESTIONS && <ProgressBar step={step} />}

        {step === 0 && (
          <QuestionShell
            title="Hvor stor skal jeres stand være?"
            helpText="Størrelsen er den største enkeltfaktor i prisen — både materialer og opbygningstid skalerer direkte med kvadratmeter."
          >
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl font-bold text-wieben-forest">{answers.size} m²</div>
              <input
                type="range"
                min={PRICING_CONFIG.minSize}
                max={PRICING_CONFIG.maxSize}
                value={answers.size}
                onChange={(e) => update('size', Number(e.target.value))}
                className="w-full max-w-md accent-wieben-forest-light"
              />
              <div className="flex w-full max-w-md justify-between text-xs text-wieben-forest/50">
                <span>{PRICING_CONFIG.minSize} m²</span>
                <span>{PRICING_CONFIG.maxSize} m²</span>
              </div>
            </div>
            <NavButtons onBack={goBack} onNext={goNext} backDisabled />
          </QuestionShell>
        )}

        {step === 1 && (
          <QuestionShell
            title="Hvilken type stand passer bedst?"
            helpText="Systemstande er hurtige og økonomiske, skræddersyede stande er unikke men dyrere med længere produktionstid, og hybrid er det bedste fra begge verdener."
          >
            <OptionCards options={STAND_TYPES} selected={answers.standType} onSelect={(v) => update('standType', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 2 && (
          <QuestionShell
            title="Skal I købe eller leje standen?"
            helpText="Køb koster mere pr. gang, men bliver billigere over flere messer. Leje er billigst første gang, men giver ingen gensalgsværdi."
          >
            <OptionCards options={OWNERSHIP_OPTIONS} selected={answers.ownership} onSelect={(v) => update('ownership', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 3 && (
          <QuestionShell
            title="Hvor mange gange skal standen bruges?"
            helpText="Dette påvirker om køb eller leje bedst kan betale sig, og om standen skal bygges til nem opbevaring og genopstilling."
          >
            <OptionCards options={FREQUENCY_OPTIONS} selected={answers.frequency} onSelect={(v) => update('frequency', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 4 && (
          <QuestionShell
            title="Hvor avanceret skal designet være?"
            helpText="Hver ekstra funktion — podier, lyskasser, skærme, møbler — tilføjer design- og produktionstid."
          >
            <OptionCards options={COMPLEXITY_OPTIONS} selected={answers.complexity} onSelect={(v) => update('complexity', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 5 && (
          <QuestionShell
            title="Hvor skal messen holdes?"
            helpText="Transport og opbygningslogistik stiger med afstanden, og internationale messer kræver ofte lokal montage-koordinering."
          >
            <OptionCards options={LOCATION_OPTIONS} selected={answers.location} onSelect={(v) => update('location', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 6 && (
          <QuestionShell
            title="Hvor lang tid er der til messen?"
            helpText="Kort tidsramme kan kræve prioriteret produktion, hvilket typisk lægger et tillæg på prisen."
          >
            <OptionCards options={TIMEFRAME_OPTIONS} selected={answers.timeframe} onSelect={(v) => update('timeframe', v)} />
            <NavButtons onBack={goBack} onNext={goNext} />
          </QuestionShell>
        )}

        {step === 7 && (
          <QuestionShell
            title="Skal vi hjælpe med opbygning og nedtagning?"
            helpText="Vælger I hjælp, klarer vores team det hele på messen. Vælger I selv, leverer vi standen klar til jeres eget team."
          >
            <OptionCards options={BUILD_HELP_OPTIONS} selected={answers.buildHelp} onSelect={(v) => update('buildHelp', v)} />
            <NavButtons onBack={goBack} onNext={goNext} nextLabel="Se dit prisestimat" />
          </QuestionShell>
        )}

        {step === TOTAL_QUESTIONS && (
          <Summary
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
  answers,
  price,
  onBack,
  contact,
  setContact,
  submitted,
  onSubmit,
}: {
  answers: ConfiguratorAnswers
  price: ReturnType<typeof calculatePrice>
  onBack: () => void
  contact: { name: string; email: string; phone: string }
  setContact: (c: { name: string; email: string; phone: string }) => void
  submitted: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  const summarySentence = `I får en ${answers.size} m² ${standTypeLabel[answers.standType]} ${locationLabel[answers.location]}, ${frequencyLabel[answers.frequency]}, ${buildHelpLabel[answers.buildHelp]}.`

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-wieben-forest-light">Jeres prisestimat</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold text-wieben-forest sm:text-4xl">
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
      <ul className="divide-y divide-wieben-forest/10 rounded-lg border border-wieben-forest/10">
        {price.lines.map((line) => (
          <li key={line.label} className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="text-[15px] font-medium text-wieben-forest">{line.label}</p>
              <p className="mt-0.5 text-sm text-wieben-forest/60">{line.description}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap font-semibold text-wieben-forest">
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
              className="rounded-md border border-wieben-forest/20 px-3 py-2 text-[15px] focus:border-wieben-forest-light focus:outline-none"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="rounded-md border border-wieben-forest/20 px-3 py-2 text-[15px] focus:border-wieben-forest-light focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Telefon (valgfrit)"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="rounded-md border border-wieben-forest/20 px-3 py-2 text-[15px] focus:border-wieben-forest-light focus:outline-none"
            />
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={onBack} className="text-[15px] font-medium text-wieben-forest/60 hover:text-wieben-forest">
              ← Tilbage
            </button>
            <button
              type="submit"
              className="rounded-md bg-wieben-forest-light px-6 py-3 text-[15px] font-semibold text-white shadow-sm hover:bg-wieben-forest transition-colors"
            >
              Send os din opsummering
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-10 rounded-lg border border-wieben-forest-light/30 bg-wieben-mint-light p-5 text-center">
          <p className="font-semibold text-wieben-forest">Tak, {contact.name.split(' ')[0] || 'der'}! 🎉</p>
          <p className="mt-1 text-sm text-wieben-forest/70">
            Vi har modtaget jeres opsummering og ringer op inden for 1-2 hverdage.
          </p>
        </div>
      )}
    </div>
  )
}
