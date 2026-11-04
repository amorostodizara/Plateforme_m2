import { jsPDF } from 'jspdf'
import { dateFr } from '@/components/app/AdminKit'
export type LignePresencePdf = {
  nom: string
  prenoms: string
  contact: string
  email: string
  statuts: Record<string, 'Présent' | 'Absent' | undefined>
}

const COULEURS = {
  Présent: { fond: [230, 244, 234], texte: [19, 115, 51] },
  Absent: { fond: [252, 232, 230], texte: [197, 34, 31] },
  'Non enregistré': { fond: [239, 244, 250], texte: [95, 99, 104] },
} as const

function couper(doc: jsPDF, texte: string, largeur: number) {
  if (doc.getTextWidth(texte) <= largeur) return texte
  let t = texte
  while (t.length > 1 && doc.getTextWidth(t + '…') > largeur) t = t.slice(0, -1)
  return t + '…'
}

export function genererFichePresencePdf(opts: {
  session: string
  dateDebut: string
  dateFin: string
  jours: string[]
  lignes: LignePresencePdf[]
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const L = 297,
    H = 210,
    M = 10
  const utile = L - 2 * M
  const jours = opts.jours

  // Largeurs : fixes + dates partagent le reste
  const wNo = 10
  let wNom = 34,
    wPre = 40,
    wCon = 28,
    wMail = 52
  const fixes = () => wNo + wNom + wPre + wCon + wMail
  let wJour = jours.length ? (utile - fixes()) / jours.length : 0
  if (jours.length && wJour < 16) {
    const dispo = utile - 16 * jours.length - wNo
    const k = Math.max(0.45, dispo / (wNom + wPre + wCon + wMail))
    wNom *= k
    wPre *= k
    wCon *= k
    wMail *= k
    wJour = (utile - fixes()) / jours.length
  }
  const cols = [
    { t: 'N°', w: wNo },
    { t: 'Nom', w: wNom },
    { t: 'Prénoms', w: wPre },
    { t: 'Contact', w: wCon },
    { t: 'Email', w: wMail },
    ...jours.map((j) => ({ t: dateFr(j), w: wJour })),
  ]
  const statutFont = wJour < 18 ? 6 : 7.5

  const entete = () => {
    doc.setFillColor(255, 121, 0)
    doc.rect(M, M, 4, 16, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(0, 0, 0)
    doc.text(
      couper(doc, `Fiche de Présence : ${opts.session}`, utile - 60),
      M + 7,
      M + 6,
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(95, 99, 104)
    doc.text(
      `Du ${dateFr(opts.dateDebut)} au ${dateFr(opts.dateFin)}  •  ODC Fianarantsoa`,
      M + 7,
      M + 13,
    )
    // légende
    let x = L - M
    ;(['Absent', 'Présent'] as const).forEach((s) => {
      const w = doc.getTextWidth(s) + 6
      x -= w
      const c = COULEURS[s]
      doc.setFillColor(c.fond[0], c.fond[1], c.fond[2])
      doc.roundedRect(x, M + 10, w, 5, 2, 2, 'F')
      doc.setTextColor(c.texte[0], c.texte[1], c.texte[2])
      doc.setFont('helvetica', 'bold')
      doc.text(s, x + 3, M + 13.5)
      x -= 2
    })
  }

  const hEnt = 9,
    hLig = 8
  let y = 0
  const enteteTable = () => {
    y = M + 22
    doc.setFillColor(0, 0, 0)
    doc.rect(M, y, utile, hEnt, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    let x = M
    cols.forEach((c, i) => {
      doc.text(
        couper(doc, c.t, c.w - 2),
        i >= 5 || i === 0 ? x + c.w / 2 : x + 1.5,
        y + 5.8,
        { align: i >= 5 || i === 0 ? 'center' : 'left' },
      )
      x += c.w
    })
    y += hEnt
  }

  const pied = (p: number, n: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(95, 99, 104)
    doc.text(`Édité le ${dateFr(new Date().toISOString())}`, M, H - 6)
    doc.text(`Page ${p} / ${n}`, L - M, H - 6, { align: 'right' })
  }

  entete()
  enteteTable()
  opts.lignes.forEach((l, idx) => {
    if (y + hLig > H - 12) {
      doc.addPage()
      entete()
      enteteTable()
    }

    doc.setDrawColor(220, 224, 230)
    doc.line(M, y + hLig, M + utile, y + hLig)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    const vals = [String(idx + 1), l.nom, l.prenoms, l.contact, l.email]
    let x = M
    vals.forEach((v, i) => {
      const c = cols[i]!
      if (i === 0) doc.text(v, x + c.w / 2, y + 5.2, { align: 'center' })
      else doc.text(couper(doc, v || '—', c.w - 3), x + 1.5, y + 5.2)
      x += c.w
    })
    jours.forEach((j) => {
      const s = l.statuts[j] ?? 'Non enregistré'
      const c = COULEURS[s]
      const lib = s === 'Non enregistré' && wJour < 22 ? 'Non enr.' : s
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(statutFont)
      const bw = Math.min(wJour - 2, doc.getTextWidth(lib) + 4)
      doc.setFillColor(c.fond[0], c.fond[1], c.fond[2])
      doc.roundedRect(x + (wJour - bw) / 2, y + 1.6, bw, 4.8, 2, 2, 'F')
      doc.setTextColor(c.texte[0], c.texte[1], c.texte[2])
      doc.text(lib, x + wJour / 2, y + 5, { align: 'center' })
      x += wJour
    })
    y += hLig
  })
  if (!opts.lignes.length) {
    doc.setFontSize(10)
    doc.setTextColor(95, 99, 104)
    doc.text('Aucun participant.', M + 2, y + 7)
  }
  // séparateurs verticaux
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    pied(p, n)
  }
  const nomFichier = `fiche-presence-${opts.session.replace(/[^\w-]+/g, '_')}.pdf`
  doc.save(nomFichier)
}
