import { CATEGORY_META, type ConfiguratorAnswers, type PriceCategory, type PriceResult } from '../pricing/config'

// ---------------------------------------------------------------------------
// Klient-genereret, brandet PDF-opsummering. Ingen backend involveret — hele
// dokumentet tegnes direkte i browseren med jsPDF og downloades med det samme.
//
// jsPDF importeres dynamisk (se generateSummaryPdf herunder) i stedet for
// statisk foroven — biblioteket trækker html2canvas/dompurify med sig og
// vejer ~250 kB, som ellers ville ligge i hoved-bundlen fra første besøg.
// Med en dynamisk import hentes det kun, når brugeren rent faktisk klikker
// "Download som PDF".
//
// Kontaktoplysningerne herunder er placeholders — udskift dem med Wieben
// Designs rigtige e-mail/telefon/hjemmeside, når de foreligger.
// ---------------------------------------------------------------------------
const COMPANY_INFO = {
  name: 'Wieben Design',
  email: 'kontakt@wiebendesign.dk',
  phone: '+45 00 00 00 00',
  website: 'wiebendesign.dk',
}

const TEAL: [number, number, number] = [0, 139, 151]
const FOREST: [number, number, number] = [10, 61, 46]
const FOREST_LIGHT: [number, number, number] = [20, 81, 63]
const MINT_LIGHT: [number, number, number] = [232, 245, 236]
const INK_MUTED: [number, number, number] = [90, 110, 100]

const CATEGORY_ORDER: PriceCategory[] = ['construction', 'layout', 'tech', 'catering', 'upsell']

const formatKr = (n: number) => `${n.toLocaleString('da-DK')} kr.`

async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Kunne ikke indlæse logo'))
    reader.readAsDataURL(blob)
  })
}

export async function generateSummaryPdf(params: {
  answers: ConfiguratorAnswers
  price: PriceResult
  summarySentence: string
  contact: { name: string; email: string; phone: string }
}): Promise<void> {
  const { price, summarySentence, contact } = params

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 18
  const contentWidth = pageWidth - marginX * 2

  // --- Header ---------------------------------------------------------
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, pageWidth, 26, 'F')

  try {
    const logoDataUrl = await loadImageAsDataUrl('/wieben-logo.png')
    // Logoet er 738×246 px ≈ forhold 3:1
    doc.addImage(logoDataUrl, 'PNG', marginX, 6, 34, 34 / 3)
  } catch {
    // Logo kunne ikke hentes (fx offline) — fortsæt uden, resten af PDF'en er stadig brugbar.
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Wieben Design', marginX, 16)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Prisestimat til messestand', pageWidth - marginX, 16, { align: 'right' })

  let y = 40

  // --- Prisestimat ------------------------------------------------------
  doc.setTextColor(...FOREST_LIGHT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('JERES PRISESTIMAT', marginX, y)
  y += 8

  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(`${formatKr(price.low)} – ${formatKr(price.high)}`, marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK_MUTED)
  doc.text('ekskl. moms — estimat, det endelige tilbud kan afvige lidt', marginX, y + 6)
  y += 16

  // --- Opsummeringssætning i mint boks ---------------------------------
  const sentenceLines = doc.splitTextToSize(summarySentence, contentWidth - 12)
  const sentenceBoxHeight = sentenceLines.length * 5 + 8
  doc.setFillColor(...MINT_LIGHT)
  doc.roundedRect(marginX, y, contentWidth, sentenceBoxHeight, 2, 2, 'F')
  doc.setTextColor(...FOREST)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(sentenceLines, marginX + 6, y + 7)
  y += sentenceBoxHeight + 10

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 30) {
      doc.addPage()
      y = 20
    }
  }

  const drawCategorySection = (category: PriceCategory) => {
    const lines = price.lines.filter((l) => l.category === category)
    if (lines.length === 0) return
    const meta = CATEGORY_META[category]
    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)

    ensureSpace(14)
    doc.setFillColor(
      parseInt(meta.color.slice(1, 3), 16),
      parseInt(meta.color.slice(3, 5), 16),
      parseInt(meta.color.slice(5, 7), 16),
    )
    doc.rect(marginX, y - 3, 3, 3, 'F')
    doc.setTextColor(...FOREST)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(meta.label, marginX + 6, y)
    doc.text(formatKr(subtotal), pageWidth - marginX, y, { align: 'right' })
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    lines.forEach((line) => {
      ensureSpace(10)
      doc.setTextColor(...FOREST)
      doc.text(line.label, marginX + 6, y)
      doc.text(`+${formatKr(line.amount)}`, pageWidth - marginX, y, { align: 'right' })
      y += 4.5
      doc.setTextColor(...INK_MUTED)
      const descLines = doc.splitTextToSize(line.description, contentWidth - 10)
      doc.text(descLines, marginX + 6, y)
      y += descLines.length * 3.8 + 3.5
    })
    y += 2
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...FOREST)
  doc.text('Prisens sammensætning', marginX, y)
  y += 8

  CATEGORY_ORDER.forEach(drawCategorySection)

  // --- Total ------------------------------------------------------------
  ensureSpace(16)
  doc.setDrawColor(...FOREST_LIGHT)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...FOREST)
  doc.text('Estimeret totalpris', marginX, y)
  doc.text(`${formatKr(price.low)} – ${formatKr(price.high)}`, pageWidth - marginX, y, { align: 'right' })
  y += 14

  // --- Kontaktoplysninger fra brugeren (hvis udfyldt) --------------------
  if (contact.name || contact.email) {
    ensureSpace(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...FOREST)
    doc.text('Jeres kontaktoplysninger', marginX, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK_MUTED)
    const contactLine = [contact.name, contact.email, contact.phone].filter(Boolean).join('  ·  ')
    doc.text(contactLine, marginX, y)
    y += 12
  }

  // --- CTA-footer ---------------------------------------------------------
  const footerHeight = 26
  const footerY = pageHeight - footerHeight
  if (y > footerY - 6) {
    doc.addPage()
  }
  doc.setFillColor(...FOREST)
  doc.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Book en uforpligtende samtale', marginX, pageHeight - footerHeight + 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(
    `${COMPANY_INFO.name}  ·  ${COMPANY_INFO.email}  ·  ${COMPANY_INFO.phone}  ·  ${COMPANY_INFO.website}`,
    marginX,
    pageHeight - footerHeight + 19,
  )

  doc.save('wieben-design-prisestimat.pdf')
}
