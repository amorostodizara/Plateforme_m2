import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import decorAttestation from '../assets/decor_attestation.png'
import SignatureDir from '../assets/Signature_directrice.png'

export type DonneesAttestation = {
  numero: string
  participant: string
  formation: string
  description: string | null
  session: string
  dateDebut: string | null
  dateFin: string | null
  delivreeLe: string
  note: number | null
  scoreRequis: number | null
  jeton: string | null
  titre: string
  texte: string
  signataire: string
  fonctionSignataire: string
  piedDePage: string
  couleur: string
  lienVerification: string
}

const ORANGE: [number, number, number] = [255, 121, 0]
const GRIS: [number, number, number] = [95, 99, 104]

const dateFr = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

function hexVersRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m || !m[1]) return ORANGE
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Dessine les décors géométriques (angles orange et gris) du modèle officiel. */
function decors(
  pdf: jsPDF,
  L: number,
  H: number,
  accent: [number, number, number],
) {
  const GRIS_FONCE: [number, number, number] = [62, 62, 68]

  // Angle supérieur gauche
  pdf.setFillColor(...accent)
  pdf.triangle(0, 0, 46, 0, 0, 46, 'F')
  pdf.setFillColor(...GRIS_FONCE)
  pdf.triangle(0, 0, 22, 0, 0, 22, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.triangle(6, 6, 30, 6, 6, 30, 'F')
  pdf.setFillColor(...accent)
  pdf.triangle(8, 8, 24, 8, 8, 24, 'F')

  // Angle supérieur droit
  pdf.setFillColor(...GRIS_FONCE)
  pdf.triangle(L, 0, L - 44, 0, L, 44, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.triangle(L - 6, 6, L - 32, 6, L - 6, 32, 'F')
  pdf.setFillColor(...accent)
  pdf.triangle(L - 8, 8, L - 26, 8, L - 8, 26, 'F')

  // Angle inférieur gauche
  pdf.setFillColor(...GRIS_FONCE)
  pdf.triangle(0, H, 0, H - 40, 40, H, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.triangle(6, H - 6, 6, H - 26, 26, H - 6, 'F')
  pdf.setFillColor(...accent)
  pdf.triangle(8, H - 8, 8, H - 22, 22, H - 8, 'F')

  // Angle inférieur droit
  pdf.setFillColor(...accent)
  pdf.triangle(L, H, L - 42, H, L, H - 42, 'F')
  pdf.setFillColor(...GRIS_FONCE)
  pdf.triangle(L, H, L - 20, H, L, H - 20, 'F')
}

/** Construit l’attestation au format A4 paysage, police Helvetica, selon le modèle officiel. */
export async function genererAttestationPdf(
  d: DonneesAttestation,
): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const L = 297
  const H = 210
  const accent = hexVersRgb(d.couleur)
  const BLEU: [number, number, number] = [0, 158, 226]

  pdf.setFillColor(248, 249, 250)
  pdf.rect(0, 0, L, H, 'F')
  decors(pdf, L, H, accent)

  // En-tête « Orange Digital Center »
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(34)
  const motOrange = 'Orange '
  const motNoir = 'Digital Center'
  const largeur = pdf.getTextWidth(motOrange) + pdf.getTextWidth(motNoir)
  let x = L / 2 - largeur / 2
  pdf.setTextColor(...accent)
  pdf.text(motOrange, x, 38)
  x += pdf.getTextWidth(motOrange)
  pdf.setTextColor(0, 0, 0)
  pdf.text(motNoir, x, 38)

  pdf.setFontSize(20)
  pdf.text(d.titre.toUpperCase(), L / 2, 52, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(30, 30, 30)
  pdf.text(`N° : ${d.numero}`, L / 2, 61, { align: 'center' })

  // Formation, en bleu
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)
  pdf.setTextColor(...BLEU)
  pdf.text(pdf.splitTextToSize(d.formation, L - 100), L / 2, 78, {
    align: 'center',
  })

  // Titulaire
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(...GRIS)
  pdf.text('décernée à', L / 2, 92, { align: 'center' })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(21)
  pdf.setTextColor(20, 20, 20)
  pdf.text(d.participant, L / 2, 104, { align: 'center' })

  pdf.setDrawColor(200, 200, 200)
  pdf.setLineWidth(0.3)
  pdf.line(L / 2 - 85, 111, L / 2 + 85, 111)

  // Corps du texte
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(40, 40, 40)
  const description =
    d.description ??
    'les compétences et connaissances prévues par cette formation'
  const corps = `Le présent certificat atteste que son titulaire a suivi avec succès la formation « ${d.formation} ». Au cours de cette formation, le participant a acquis ${description}.`
  pdf.text(pdf.splitTextToSize(corps, L - 110), L / 2, 120, { align: 'center' })
  pdf.text(
    'En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.',
    L / 2,
    138,
    { align: 'center' },
  )

  // Période, en orange
  pdf.setFontSize(10.5)
  const prefixe = 'Formation dispensée du '
  const periode = `${dateFr(d.dateDebut)} au ${dateFr(d.dateFin)}`
  const largeurLigne = pdf.getTextWidth(prefixe) + pdf.getTextWidth(periode)
  let xl = L / 2 - largeurLigne / 2
  pdf.setTextColor(40, 40, 40)
  pdf.text(prefixe, xl, 145)
  xl += pdf.getTextWidth(prefixe)
  pdf.setTextColor(...accent)
  pdf.text(periode, xl, 145)

  const prefixe2 = 'par '
  const organisme = 'Orange Digital Center Madagascar.'
  const largeur2 = pdf.getTextWidth(prefixe2) + pdf.getTextWidth(organisme)
  let x2 = L / 2 - largeur2 / 2
  pdf.setTextColor(40, 40, 40)
  pdf.text(prefixe2, x2, 151)
  x2 += pdf.getTextWidth(prefixe2)
  pdf.setTextColor(...accent)
  pdf.text(organisme, x2, 151)

  // Date de délivrance
  const faitLe = 'Délivré le : '
  const valeurDate = dateFr(d.delivreeLe)
  const largeur3 = pdf.getTextWidth(faitLe) + pdf.getTextWidth(valeurDate)
  let x3 = L / 2 - largeur3 / 2
  pdf.setTextColor(40, 40, 40)
  pdf.text(faitLe, x3, 162)
  x3 += pdf.getTextWidth(faitLe)
  pdf.setTextColor(...accent)
  pdf.text(valeurDate, x3, 162)

  // Note obtenue (mention interne, discrète)
  if (d.note !== null) {
    pdf.setFontSize(9)
    pdf.setTextColor(...GRIS)
    pdf.text(
      `Note obtenue : ${d.note.toFixed(2).replace(/\.00$/, '')} / 100${d.scoreRequis !== null ? ` — seuil de réussite : ${d.scoreRequis}` : ''}`,
      L / 2,
      168,
      { align: 'center' },
    )
  }

  // QR code de vérification
  try {
    const qr = await QRCode.toDataURL(d.lienVerification, {
      margin: 0,
      width: 300,
    })
    pdf.addImage(qr, 'PNG', L / 2 - 13, 175, 25, 25)
  } catch {
    /* le QR reste facultatif */
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(40, 40, 40)
  pdf.text('Scan to verify', L / 2, 205, { align: 'center' })

  // Signature
  pdf.addImage(SignatureDir, 'PNG', 52, 158, 30, 30)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(20, 20, 20)
  pdf.text(d.signataire.toUpperCase(), 62, 190, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...GRIS)
  pdf.text(d.fonctionSignataire, 62, 195, { align: 'center' })

  // Médaille
  // medaille(pdf, L - 42, 176, accent);
  pdf.addImage(decorAttestation, 'PNG', L - 82, 175, 25, 25)
  // Pied de page discret
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  pdf.text(d.piedDePage, L - 5, 120, { align: 'center', angle: 90 })

  return pdf
}

export async function telechargerAttestationPdf(d: DonneesAttestation) {
  const pdf = await genererAttestationPdf(d)
  pdf.save(`attestation-${d.numero}.pdf`)
}
