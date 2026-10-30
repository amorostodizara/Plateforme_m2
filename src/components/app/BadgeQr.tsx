import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Badge QR d’un participant : le code scanné à l’entrée d’une session. */
export function BadgeQr({
  ouvert,
  onOuvertChange,
  jeton,
  nom,
  sousTitre,
}: {
  ouvert: boolean
  onOuvertChange: (v: boolean) => void
  jeton: string | null
  nom: string
  sousTitre?: string
}) {
  const [image, setImage] = useState<string | null>(null)
  useEffect(() => {
    let annule = false
    if (!ouvert || !jeton) {
      setImage(null)
      return
    }
    QRCode.toDataURL(jeton, {
      width: 320,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!annule) setImage(url)
      })
      .catch(() => {
        if (!annule) setImage(null)
      })
    return () => {
      annule = true
    }
  }, [ouvert, jeton])

  const telechargerBadge = async () => {
    if (!image) return
    try {
      const qr = new Image()
      qr.onload = () => {
        // Haute définition : 2x par rapport à la taille d'affichage
        const largeur = 1400
        const hauteur = 1700

        const canvas = document.createElement('canvas')
        canvas.width = largeur
        canvas.height = hauteur

        const ctx = canvas.getContext('2d')

        if (!ctx) return

        // Fond
        ctx.fillStyle = '#FFF8F0'
        ctx.fillRect(0, 0, largeur, hauteur)

        // Bordure
        ctx.strokeStyle = '#DADCE0'
        ctx.lineWidth = 4
        ctx.strokeRect(2, 2, largeur - 4, hauteur - 4)

        // QR Code
        const tailleQr = 1000
        const xQr = (largeur - tailleQr) / 2
        const yQr = 120

        // Fond blanc autour du QR
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(xQr - 30, yQr - 30, tailleQr + 60, tailleQr + 60)

        // QR haute définition
        ctx.imageSmoothingEnabled = false

        ctx.drawImage(qr, xQr, yQr, tailleQr, tailleQr)

        // Nom
        ctx.fillStyle = '#000000'
        ctx.font = 'bold 56px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        ctx.fillText(nom, largeur / 2, 1280)

        // Sous-titre
        if (sousTitre) {
          ctx.fillStyle = '#5F6368'
          ctx.font = '40px Arial'

          ctx.fillText(sousTitre, largeur / 2, 1350)
        }
        // Jeton
        ctx.fillStyle = '#5F6368'
        ctx.font = '28px Arial'
        const texteJeton = jeton ?? '—'
        const longueurMax = 80
        const morceaux = texteJeton.match(
          new RegExp(`.{1,${longueurMax}}`, 'g'),
        ) ?? ['—']

        morceaux.forEach((morceau, index) => {
          ctx.fillText(morceau, largeur / 2, 1420 + index * 40)
        })
        // Téléchargement PNG haute définition
        canvas.toBlob((blob) => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const lien = document.createElement('a')
          lien.href = url

          lien.download = `badge-${nom.replace(/\s+/g, '-').toLowerCase()}.png`

          document.body.appendChild(lien)
          lien.click()
          document.body.removeChild(lien)

          URL.revokeObjectURL(url)
        }, 'image/png')
      }
      qr.onerror = () => {
        console.error('Impossible de charger le QR code.')
      }
      qr.src = image
    } catch (error) {
      console.error('Erreur lors du téléchargement du badge :', error)
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <QrCode className="mr-2 inline h-4 w-4" />
            Badge de présence
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-cream p-5">
          {image ? (
            <img
              src={image}
              alt={`Badge QR de ${nom}`}
              className="h-56 w-56 rounded-md bg-white p-2"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-md bg-white text-xs text-muted-foreground">
              {jeton ? 'Génération…' : 'Aucun badge disponible'}
            </div>
          )}
          <p className="text-sm font-bold text-foreground">{nom}</p>
          {sousTitre ? (
            <p className="text-xs text-muted-foreground">{sousTitre}</p>
          ) : null}
          <p className="break-all text-center text-[10px] text-muted-foreground">
            {jeton ?? '—'}
          </p>
        </div>
        {image ? (
          <Button type="button" variant="outline" onClick={telechargerBadge}>
            <Download />
            Télécharger le badge
          </Button>
        ) : // <Button asChild variant="outline">
        //   <a
        //     href={image}
        //     download={`badge-${nom.replace(/\s+/g, '-').toLowerCase()}.png`}
        //   >
        //     <Download /> Télécharger le badge
        //   </a>
        // </Button>
        null}
      </DialogContent>
    </Dialog>
  )
}
