import { PRICING_CONFIG, type ConfiguratorAnswers, type OpenSides } from '../pricing/config'

// ---------------------------------------------------------------------------
// Live 2D-skitse (top-down) af standen — ren SVG styret af React state, ingen
// 3D-bibliotek eller billedgenerering. Tegningen genberegnes ved hvert svar,
// og CSS-transitions på de animérbare SVG-egenskaber (x/y/width/height/r) gør
// at den glider blødt i stedet for at "hoppe".
//
// Et par af elementerne er koblet til spørgsmål, der ikke har en 1:1 "dette
// er reception/siddepladser"-mulighed i flowet — de er valgt som de mest
// naturlige proxyer:
//   - Reception/disk → vises hvis "Bardisk/udskænkningsdisk" er valgt under
//     forplejningsudstyr (det er bogstaveligt talt et fast møbel ved indgangen).
//   - Siddepladser → antal styres af "Lyd og præsentation" (flere/større
//     gruppepræsentationer ⇒ flere stole).
// ---------------------------------------------------------------------------

const CLOSED_SIDES: Record<OpenSides, Array<'top' | 'right' | 'bottom' | 'left'>> = {
  1: ['top', 'left', 'right'],
  2: ['top', 'left'],
  3: ['top'],
  4: [],
}

const VIEW = 320
const CENTER = VIEW / 2
const TRANSITION = 'x 300ms ease, y 300ms ease, width 300ms ease, height 300ms ease, cx 300ms ease, cy 300ms ease, r 300ms ease'

function sizeToPx(size: number) {
  const minSide = Math.sqrt(PRICING_CONFIG.minSize)
  const maxSide = Math.sqrt(PRICING_CONFIG.maxSize)
  const t = (Math.sqrt(size) - minSide) / (maxSide - minSide)
  return 90 + t * 100 // 90–190 px footprint, med plads til "Gang"-labels udenom
}

const SEAT_LAYOUTS: Record<number, [number, number][]> = {
  0: [],
  3: [
    [0.3, 0.62],
    [0.5, 0.62],
    [0.7, 0.62],
  ],
  6: [
    [0.28, 0.4],
    [0.5, 0.4],
    [0.72, 0.4],
    [0.28, 0.66],
    [0.5, 0.66],
    [0.72, 0.66],
  ],
}

const floorCaption = {
  standard: 'standardgulv',
  vinyl: 'vinylgulv',
  wood: 'trægulv',
  raised: 'hævet gulv',
}

export default function StandPreview({ answers }: { answers: ConfiguratorAnswers }) {
  const px = sizeToPx(answers.size)
  const x = CENTER - px / 2
  const y = CENTER - px / 2 + 14 // lidt plads foroven til hængeskiltet
  const closed = CLOSED_SIDES[answers.openSides]
  const wallThickness = 3.5

  const floorFill =
    answers.floor === 'standard'
      ? '#dcdcd4'
      : answers.ownFloorType === 'wood'
        ? '#c99a63'
        : answers.ownFloorType === 'raised'
          ? '#ecdfc2'
          : '#f4f2ec'
  const isWood = answers.floor === 'own' && answers.ownFloorType === 'wood'
  // Plankesømme tegnes som separate, tynde striber i stedet for et SVG
  // <pattern>-fill — mønster-fills via <pattern> renderede upålideligt i test.
  const plankYs = isWood ? [0.25, 0.5, 0.75].map((f) => y + f * px) : []

  const seatCount = { none: 0, occasional: 3, regular: 6 }[answers.audioPresentation] as 0 | 3 | 6
  const seats = SEAT_LAYOUTS[seatCount]
  const showDesk = answers.catering.includes('bar')
  const showSign = answers.hangingSign === 'yes'
  const isRaised = answers.floor === 'own' && answers.ownFloorType === 'raised'

  const openLabelPos: Partial<Record<'top' | 'right' | 'bottom' | 'left', { tx: number; ty: number; anchor: 'middle' | 'start' | 'end' }>> = {
    top: { tx: CENTER, ty: y - 10, anchor: 'middle' },
    right: { tx: x + px + 10, ty: CENTER + 14, anchor: 'start' },
    bottom: { tx: CENTER, ty: y + px + 20, anchor: 'middle' },
    left: { tx: x - 10, ty: CENTER + 14, anchor: 'end' },
  }

  const floorLabel = answers.floor === 'standard' ? floorCaption.standard : floorCaption[answers.ownFloorType]

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full" role="img" aria-label="Skitse af jeres messestand set oppefra">
        {/* Hængeskilt */}
        {showSign && (
          <g style={{ transition: TRANSITION }}>
            <line x1={x + 8} y1={y - 24} x2={x} y2={y} stroke="var(--color-wieben-forest-light, #14513f)" strokeWidth="1" opacity="0.5" />
            <line x1={x + px - 8} y1={y - 24} x2={x + px} y2={y} stroke="var(--color-wieben-forest-light, #14513f)" strokeWidth="1" opacity="0.5" />
            <rect x={CENTER - 22} y={y - 34} width="44" height="20" rx="4" className="fill-wieben-forest-light" />
            <path
              d={`M${CENTER - 12} ${y - 22} q4 -8 8 0 q4 -8 8 0`}
              fill="none"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Hævet gulv — antydet med en let forsænket kant ("trin") */}
        {isRaised && (
          <rect
            x={x - 5}
            y={y - 5}
            width={px + 10}
            height={px + 10}
            rx="6"
            fill="none"
            stroke="#c9b484"
            strokeWidth="2"
            strokeDasharray="2 3"
            style={{ transition: TRANSITION }}
          />
        )}

        {/* Gulv */}
        <rect x={x} y={y} width={px} height={px} rx="3" fill={floorFill} stroke="#00000012" style={{ transition: TRANSITION }} />
        {plankYs.map((plankY, i) => (
          <rect key={i} x={x} y={plankY} width={px} height="1.6" fill="#b98750" opacity="0.6" style={{ transition: TRANSITION }} />
        ))}

        {/* Reception/disk ved indgangen (bunden er altid den åbne "front") */}
        {showDesk && (
          <rect
            x={CENTER - px * 0.14}
            y={y + px - px * 0.16 - 6}
            width={px * 0.28}
            height={px * 0.16}
            rx="2"
            className="fill-wieben-mint"
            stroke="var(--color-wieben-forest-light, #14513f)"
            strokeWidth="1"
            style={{ transition: TRANSITION }}
          />
        )}

        {/* Siddepladser */}
        {seats.map(([fx, fy], i) => (
          <circle
            key={i}
            cx={x + fx * px}
            cy={y + fy * px}
            r={Math.max(4.5, px * 0.035)}
            className="fill-wieben-forest-light"
            opacity="0.8"
            style={{ transition: TRANSITION }}
          />
        ))}

        {/* Vægge — tegnes kun på de LUKKEDE sider */}
        {closed.includes('top') && (
          <rect x={x} y={y - wallThickness / 2} width={px} height={wallThickness} className="fill-wieben-forest" style={{ transition: TRANSITION }} />
        )}
        {closed.includes('right') && (
          <rect x={x + px - wallThickness / 2} y={y} width={wallThickness} height={px} className="fill-wieben-forest" style={{ transition: TRANSITION }} />
        )}
        {closed.includes('bottom') && (
          <rect x={x} y={y + px - wallThickness / 2} width={px} height={wallThickness} className="fill-wieben-forest" style={{ transition: TRANSITION }} />
        )}
        {closed.includes('left') && (
          <rect x={x - wallThickness / 2} y={y} width={wallThickness} height={px} className="fill-wieben-forest" style={{ transition: TRANSITION }} />
        )}

        {/* "Gang"-labels ved de åbne sider */}
        {(['top', 'right', 'bottom', 'left'] as const)
          .filter((side) => !closed.includes(side))
          .map((side) => {
            const pos = openLabelPos[side]
            if (!pos) return null
            return (
              <text
                key={side}
                x={pos.tx}
                y={pos.ty}
                textAnchor={pos.anchor}
                className="fill-wieben-forest/45"
                style={{ font: '600 9px Inter, sans-serif', letterSpacing: '0.04em', transition: TRANSITION }}
              >
                GANG
              </text>
            )
          })}
      </svg>

      <p className="mt-1 text-center text-xs font-medium text-wieben-forest/60">
        {answers.openSides} åbne sider · {floorLabel} · {answers.size} m²
      </p>
    </div>
  )
}
