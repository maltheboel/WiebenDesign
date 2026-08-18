// ---------------------------------------------------------------------------
// PRISLOGIK — Wieben Design priskonfigurator
//
// Alle tal herunder er let at justere. Formlen er (i grove træk):
//
//   grundpris = m² × kr./m² (afhængig af standtype) × leje/køb-faktor
//   tillæg    = grundpris × (genbrug% + kompleksitet% + lokation% + tidsramme%)
//   opbygning = m² × pris pr. m² for opbygning/nedtagning (kun hvis valgt)
//   total     = grundpris + tillæg + opbygning
//   estimat   = [total × estimateRangeLow ; total × estimateRangeHigh]
//
// Alle beløb er i DKK ekskl. moms.
// ---------------------------------------------------------------------------

export type StandType = 'system' | 'hybrid' | 'custom'
export type Ownership = 'buy' | 'rent'
export type Frequency = 'once' | 'few' | 'rotation'
export type Complexity = 'simple' | 'medium' | 'advanced'
export type Location = 'dk' | 'europe' | 'world'
export type Timeframe = 'long' | 'medium' | 'short'
export type BuildHelp = 'help' | 'diy'

export const PRICING_CONFIG = {
  // 1) Grundpris pr. m², afhængig af standtype
  pricePerSqm: {
    system: 3200,
    hybrid: 4200,
    custom: 5800,
  } satisfies Record<StandType, number>,

  // 2) Leje er billigere end køb (faktor ganges på grundprisen)
  ownershipMultiplier: {
    buy: 1,
    rent: 0.62,
  } satisfies Record<Ownership, number>,

  // 3) Skal standen bruges flere gange, kræver den ekstra robust
  //    konstruktion til nem nedpakning/genopstilling — tillæg i % af grundpris
  reusabilitySurchargePct: {
    once: 0,
    few: 0.08,
    rotation: 0.14,
  } satisfies Record<Frequency, number>,

  // 4) Design-kompleksitet — tillæg i % af grundpris
  complexitySurchargePct: {
    simple: 0,
    medium: 0.15,
    advanced: 0.35,
  } satisfies Record<Complexity, number>,

  // 5) Lokation — tillæg for transport + montage-koordinering, i % af grundpris
  locationSurchargePct: {
    dk: 0,
    europe: 0.12,
    world: 0.3,
  } satisfies Record<Location, number>,

  // 6) Tidsramme — rush-tillæg for prioriteret produktion, i % af grundpris
  timeframeSurchargePct: {
    long: 0,
    medium: 0.1,
    short: 0.25,
  } satisfies Record<Timeframe, number>,

  // 7) Opbygning/nedtagning — fast pris pr. m² hvis Wieben Design skal stå for det
  buildHelpPricePerSqm: {
    help: 450,
    diy: 0,
  } satisfies Record<BuildHelp, number>,

  // 8) Usikkerhedsspænd på det endelige estimat (vises som prisinterval, ikke ét tal)
  estimateRangeLow: 0.9,
  estimateRangeHigh: 1.18,

  // Grænser for m²-sliderern
  minSize: 6,
  maxSize: 150,
  defaultSize: 20,
}

export interface ConfiguratorAnswers {
  size: number
  standType: StandType
  ownership: Ownership
  frequency: Frequency
  complexity: Complexity
  location: Location
  timeframe: Timeframe
  buildHelp: BuildHelp
}

export interface PriceLine {
  label: string
  amount: number
  description: string
}

export interface PriceResult {
  lines: PriceLine[]
  total: number
  low: number
  high: number
}

const formatDkk = (n: number) =>
  Math.round(n / 100) * 100 // rund til nærmeste 100 kr., undgår falsk præcision

export function calculatePrice(a: ConfiguratorAnswers): PriceResult {
  const c = PRICING_CONFIG

  const basePrice = a.size * c.pricePerSqm[a.standType] * c.ownershipMultiplier[a.ownership]

  const reusabilityAmount = basePrice * c.reusabilitySurchargePct[a.frequency]
  const complexityAmount = basePrice * c.complexitySurchargePct[a.complexity]
  const locationAmount = basePrice * c.locationSurchargePct[a.location]
  const timeframeAmount = basePrice * c.timeframeSurchargePct[a.timeframe]
  const buildHelpAmount = a.size * c.buildHelpPricePerSqm[a.buildHelp]

  const lines: PriceLine[] = [
    {
      label: `Standstørrelse: ${a.size} m²`,
      amount: formatDkk(basePrice),
      description: `Basisomkostning for en ${
        a.standType === 'system' ? 'systemstand' : a.standType === 'hybrid' ? 'hybridstand' : 'skræddersyet stand'
      } på ${a.size} m², ${a.ownership === 'rent' ? 'til leje' : 'til køb'}.`,
    },
  ]

  if (reusabilityAmount > 0) {
    lines.push({
      label:
        a.frequency === 'rotation'
          ? 'Fast rotation på flere messer → tillæg for holdbar konstruktion'
          : '2-4 messer årligt → tillæg for holdbar konstruktion',
      amount: formatDkk(reusabilityAmount),
      description: 'Standen bygges så den nemt og sikkert kan pakkes ned og stilles op igen.',
    })
  }

  if (complexityAmount > 0) {
    lines.push({
      label:
        a.complexity === 'advanced'
          ? 'Avanceret design → tillæg for specialelementer'
          : 'Mellemkompleks design → tillæg for ekstra detaljer',
      amount: formatDkk(complexityAmount),
      description: 'Podier, lyskasser, skærme og møbler kræver ekstra design- og produktionstid.',
    })
  }

  if (locationAmount > 0) {
    lines.push({
      label:
        a.location === 'world' ? 'Messe uden for Europa → transport og montage' : 'Europæisk messe → transport og montage',
      amount: formatDkk(locationAmount),
      description: 'Længere transport og lokal montage-koordinering lægger sig oveni prisen.',
    })
  }

  if (timeframeAmount > 0) {
    lines.push({
      label: a.timeframe === 'short' ? 'Under 1 måned til messen → rush-tillæg' : '1-3 måneder til messen → mindre rush-tillæg',
      amount: formatDkk(timeframeAmount),
      description: 'Kort tid til deadline betyder prioriteret produktion i værkstedet.',
    })
  }

  if (buildHelpAmount > 0) {
    lines.push({
      label: 'Opbygning og nedtagning inkluderet',
      amount: formatDkk(buildHelpAmount),
      description: 'Vores team klarer opbygning og nedtagning på messen for jer.',
    })
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0)

  return {
    lines,
    total: formatDkk(total),
    low: formatDkk(total * c.estimateRangeLow),
    high: formatDkk(total * c.estimateRangeHigh),
  }
}
