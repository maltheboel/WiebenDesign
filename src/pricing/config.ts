// ---------------------------------------------------------------------------
// PRISLOGIK — Wieben Design priskonfigurator
//
// Formlen er (i grove træk):
//
//   grundpris  = m² × kr./m²
//   tillæg     = grundpris × (åbne-sider% + andre %-tillæg)
//              + faste kr.-tillæg (hængeskilt, udstyr, tilvalg m.m.)
//   total      = grundpris + tillæg
//   estimat    = [total × estimateRangeLow ; total × estimateRangeHigh]
//
// Alle beløb er i DKK ekskl. moms. Alle konstanter herunder kan justeres frit
// — de fleste linjer i prisopsummeringen er navngivet efter nøglerne herunder,
// så et nyt navn på fx et gulv-tilvalg skal opdateres begge steder.
//
// OBS strøm/vand: hvert udstyrsvalg i `cateringItemFee` har sin egen
// tilslutnings-omkostning bagt ind i prisen. Hvis der senere tilføjes et
// separat "strømpunkt"-spørgsmål, skal strøm-delen trækkes ud af disse
// priser først, så der ikke opkræves dobbelt tillæg for samme stikkontakt.
// ---------------------------------------------------------------------------

export type OpenSides = 1 | 2 | 3 | 4
export type YesNo = 'yes' | 'no'
export type FloorChoice = 'standard' | 'own'
export type OwnFloorType = 'vinyl' | 'wood' | 'raised'
export type ProductDisplay = 'shelves' | 'cases' | 'hanging' | 'live'
export type OvernightStorage = 'none' | 'cabinet' | 'room'
export type AudioPresentation = 'none' | 'occasional' | 'regular'
export type Internet = 'standard' | 'dedicated'
export type CateringItem = 'coffee' | 'fridge' | 'wine_cooler' | 'sink' | 'bar'
export type BuildHelp = 'help' | 'diy'

export const PRICING_CONFIG = {
  // 1) Grundpris pr. m² — dækker basis-opbygning
  basePricePerSqm: 3200,

  // 2) Åbne sider — jo flere sider der skal se færdige/præsentable ud, jo
  //    større tillæg (i % af grundprisen)
  openSidesSurchargePct: {
    1: 0,
    2: 0.12,
    3: 0.28,
    4: 0.45,
  } satisfies Record<OpenSides, number>,

  // 3) Hængeskilt — fast tillæg (godkendelse, rigging, montagetid)
  hangingSignFee: 8500,

  // 4) Eget gulv — pris pr. m², afhængig af gulvtype (kun hvis "eget gulv" er valgt)
  ownFloorPricePerSqm: {
    vinyl: 180,
    wood: 320,
    raised: 480,
  } satisfies Record<OwnFloorType, number>,

  // 5) Sådan vises produkterne — fast tillæg pr. løsning
  productDisplayFee: {
    shelves: 0,
    cases: 2800,
    hanging: 1800,
    live: 3500,
  } satisfies Record<ProductDisplay, number>,

  // 6) Natlig opbevaring — fast tillæg
  overnightStorageFee: {
    none: 0,
    cabinet: 1200,
    room: 4500,
  } satisfies Record<OvernightStorage, number>,

  // 7) Lyd og præsentation — fast tillæg
  audioPresentationFee: {
    none: 0,
    occasional: 1500,
    regular: 4200,
  } satisfies Record<AudioPresentation, number>,

  // 8) Internetforbindelse — fast tillæg for dedikeret linje
  internetFee: {
    standard: 0,
    dedicated: 2200,
  } satisfies Record<Internet, number>,

  // 9) Udstyr til forplejning — fast tillæg pr. valgt stykke udstyr
  //    (inkl. tilslutning til strøm/vand/afløb, se OBS ovenfor)
  cateringItemFee: {
    coffee: 900,
    fridge: 850,
    wine_cooler: 950,
    sink: 1600,
    bar: 3200,
  } satisfies Record<CateringItem, number>,

  // 10) Opbygning/nedtagning — fast pris pr. m² hvis Wieben Design skal stå for det
  buildHelpPricePerSqm: {
    help: 450,
    diy: 0,
  } satisfies Record<BuildHelp, number>,

  // 11-13) Mersalg — faste tillæg for valgfrie tilkøb
  insuranceFee: 1400,
  storageFee: 3800,
  photographyFee: 2600,

  // Usikkerhedsspænd på det endelige estimat (vises som prisinterval, ikke ét tal)
  estimateRangeLow: 0.9,
  estimateRangeHigh: 1.18,

  // Grænser for m²-sliderern
  minSize: 6,
  maxSize: 150,
  defaultSize: 20,
}

export interface ConfiguratorAnswers {
  size: number
  openSides: OpenSides
  hangingSign: YesNo
  floor: FloorChoice
  ownFloorType: OwnFloorType // kun relevant når floor === 'own'
  productDisplay: ProductDisplay
  overnightStorage: OvernightStorage
  audioPresentation: AudioPresentation
  internet: Internet
  catering: CateringItem[]
  buildHelp: BuildHelp
  // Mersalg
  insurance: YesNo
  storage: YesNo
  photography: YesNo
}

export interface PriceLine {
  label: string
  amount: number
  description: string
  kind: 'core' | 'upsell'
}

export interface PriceResult {
  lines: PriceLine[]
  total: number
  low: number
  high: number
}

const formatDkk = (n: number) => Math.round(n / 100) * 100 // rund til nærmeste 100 kr., undgår falsk præcision

const openSidesName: Record<OpenSides, string> = {
  1: 'rækkestand',
  2: 'hjørnestand',
  3: 'gavlstand',
  4: 'ø-stand',
}

const ownFloorLabel: Record<OwnFloorType, string> = {
  vinyl: 'Vinylgulv',
  wood: 'Trægulv',
  raised: 'Hævet gulv (podium)',
}

const productDisplayLabel: Record<ProductDisplay, string> = {
  shelves: 'Åbne hylder/borde',
  cases: 'Lukkede montrer/vitriner',
  hanging: 'Hængende/ophængt fremvisning',
  live: 'Live-kørende produkt',
}

const cateringLabel: Record<CateringItem, string> = {
  coffee: 'Kaffemaskine',
  fridge: 'Køleskab',
  wine_cooler: 'Vinkøler',
  sink: 'Håndvask/opvaskeplads',
  bar: 'Bardisk/udskænkningsdisk',
}

export function calculatePrice(a: ConfiguratorAnswers): PriceResult {
  const c = PRICING_CONFIG
  const base = a.size * c.basePricePerSqm

  const lines: PriceLine[] = [
    {
      label: `Standstørrelse: ${a.size} m²`,
      amount: formatDkk(base),
      description: 'Grundpris for opbygning — skalerer direkte med kvadratmeter.',
      kind: 'core',
    },
  ]

  const openSidesAmount = base * c.openSidesSurchargePct[a.openSides]
  if (openSidesAmount > 0) {
    lines.push({
      label: `${a.openSides} åbne sider (${openSidesName[a.openSides]})`,
      amount: formatDkk(openSidesAmount),
      description: 'Flere synlige sider betyder flere flader, der skal fremstå helt færdige.',
      kind: 'core',
    })
  }

  if (a.hangingSign === 'yes') {
    lines.push({
      label: 'Hængeskilt',
      amount: formatDkk(c.hangingSignFee),
      description: 'Godkendelse og rigging fra messehallen samt ekstra montagetid.',
      kind: 'core',
    })
  }

  if (a.floor === 'own') {
    const floorAmount = a.size * c.ownFloorPricePerSqm[a.ownFloorType]
    lines.push({
      label: ownFloorLabel[a.ownFloorType],
      amount: formatDkk(floorAmount),
      description:
        a.ownFloorType === 'raised'
          ? 'Løftet 5-15 cm over hallens gulv — skjuler kabler, kræver ramper ved indgange.'
          : a.ownFloorType === 'wood'
            ? 'Ægte eller finér-lameller — varmt udtryk, mere tid at lægge og transportere.'
            : 'Tyndt og fleksibelt — hurtigst at lægge og billigst af de tre.',
      kind: 'core',
    })
  }

  const displayAmount = c.productDisplayFee[a.productDisplay]
  if (displayAmount > 0) {
    lines.push({
      label: productDisplayLabel[a.productDisplay],
      amount: formatDkk(displayAmount),
      description: 'Sådan gæster ser og oplever jeres produkter på standen.',
      kind: 'core',
    })
  }

  const storageAmount = c.overnightStorageFee[a.overnightStorage]
  if (storageAmount > 0) {
    lines.push({
      label: a.overnightStorage === 'room' ? 'Aflåst rum til natten' : 'Låsbart skab til natten',
      amount: formatDkk(storageAmount),
      description: 'Sikker opbevaring af værdigenstande, når hallen er lukket.',
      kind: 'core',
    })
  }

  const audioAmount = c.audioPresentationFee[a.audioPresentation]
  if (audioAmount > 0) {
    lines.push({
      label: a.audioPresentation === 'regular' ? 'Fast lydanlæg og scenebelysning' : 'Håndholdt mikrofon/højtaler',
      amount: formatDkk(audioAmount),
      description: 'Udstyr til oplæg og demoer for grupper på standen.',
      kind: 'core',
    })
  }

  const internetAmount = c.internetFee[a.internet]
  if (internetAmount > 0) {
    lines.push({
      label: 'Dedikeret internetlinje',
      amount: formatDkk(internetAmount),
      description: 'Egen forbindelse ud over hallens gratis wifi — til betaling, livestream eller tunge demoer.',
      kind: 'core',
    })
  }

  a.catering.forEach((item) => {
    lines.push({
      label: cateringLabel[item],
      amount: formatDkk(c.cateringItemFee[item]),
      description: 'Lejes særskilt og kræver tilslutning til strøm, vand eller afløb.',
      kind: 'core',
    })
  })

  const buildHelpAmount = a.size * c.buildHelpPricePerSqm[a.buildHelp]
  if (buildHelpAmount > 0) {
    lines.push({
      label: 'Opbygning og nedtagning inkluderet',
      amount: formatDkk(buildHelpAmount),
      description: 'Vores team klarer opbygning og nedtagning på messen for jer.',
      kind: 'core',
    })
  }

  if (a.insurance === 'yes') {
    lines.push({
      label: 'Messeforsikring (tilvalg)',
      amount: formatDkk(c.insuranceFee),
      description: 'Dækning mod skader, tyveri eller brand under opstilling og messe.',
      kind: 'upsell',
    })
  }

  if (a.storage === 'yes') {
    lines.push({
      label: 'Opbevaring mellem messer (tilvalg)',
      amount: formatDkk(c.storageFee),
      description: 'Vi opbevarer standen på vores lager, til I skal bruge den igen.',
      kind: 'upsell',
    })
  }

  if (a.photography === 'yes') {
    lines.push({
      label: 'Fotopakke (tilvalg)',
      amount: formatDkk(c.photographyFee),
      description: 'Professionelle fotos af den færdige stand til jeres egen markedsføring.',
      kind: 'upsell',
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
