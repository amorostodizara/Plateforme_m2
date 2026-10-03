import type { ReactNode } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function MenuActions({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const champClass =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none'
export const selectClass =
  'h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none'
export const labelClass =
  'mb-1 block text-xs font-semibold tracking-wide text-muted-foreground'

export function EnteteAdmin({
  titre,
  description,
  action,
}: {
  titre: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{titre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function CarteStat({
  libelle,
  valeur,
}: {
  libelle: string
  valeur: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">
        {libelle}
      </p>
      <p className="mt-2 text-2xl font-bold text-foreground">{valeur}</p>
    </div>
  )
}

/** Panneau latéral droit, inspiré du panneau de détails de Google Drive. */
export function PanneauDetail({
  titre,
  sousTitre,
  onFermer,
  children,
}: {
  titre: string
  sousTitre?: string | undefined
  onFermer: () => void
  children: ReactNode
}) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{titre}</p>
          {sousTitre ? (
            <p className="truncate text-xs text-muted-foreground">
              {sousTitre}
            </p>
          ) : null}
        </div>
        <button
          onClick={onFermer}
          aria-label="Fermer le panneau"
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="app-scrollbar flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  )
}

export function SectionPanneau({
  titre,
  children,
}: {
  titre: string
  children: ReactNode
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {titre}
      </h3>
      <div className="space-y-2 text-sm text-foreground">{children}</div>
    </section>
  )
}

export function LigneInfo({
  libelle,
  valeur,
}: {
  libelle: string
  valeur: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-1.5">
      <span className="text-xs text-muted-foreground">{libelle}</span>
      <span className="text-right text-xs font-medium text-foreground">
        {valeur ?? '—'}
      </span>
    </div>
  )
}

const couleurs: Record<string, string> = {
  Publiée: 'bg-[#E6F4EA] text-[#137333]',
  Acceptée: 'bg-[#E6F4EA] text-[#137333]',
  Valide: 'bg-[#E6F4EA] text-[#137333]',
  Actif: 'bg-[#E6F4EA] text-[#137333]',
  Présent: 'bg-[#E6F4EA] text-[#137333]',
  Payé: 'bg-[#E6F4EA] text-[#137333]',
  Terminée: 'bg-secondary text-muted-foreground',
  Archivée: 'bg-secondary text-muted-foreground',
  Inactif: 'bg-secondary text-muted-foreground',
  Brouillon: 'bg-cream text-primary',
  'En attente': 'bg-cream text-primary',
  'En cours': 'bg-cream text-primary',
  Planifiée: 'bg-[#E8F0FE] text-[#1A73E8]',
  Annulée: 'bg-[#FCE8E6] text-[#C5221F]',
  Annulé: 'bg-[#FCE8E6] text-[#C5221F]',
  Refusée: 'bg-[#FCE8E6] text-[#C5221F]',
  Absent: 'bg-[#FCE8E6] text-[#C5221F]',
}

export function Etiquette({ valeur }: { valeur: string | null | undefined }) {
  if (!valeur) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${couleurs[valeur] ?? 'bg-secondary text-muted-foreground'}`}
    >
      {valeur}
    </span>
  )
}

export function LabelObligatoire() {
  return (
    <span className="font-bold text-red-500" aria-hidden="true">
      *
    </span>
  )
}

export const dateFr = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—'

export const dateHeureFr = (v?: string | null) => {
  if (!v) return '—'
  return new Date(v).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Indian/Antananarivo',
  })
}

export const quand = (v: string) => {
  const d = new Date(v)
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formaterPeriodeCatalogue(
  dateDebut: string,
  dateFin: string,
): string {
  const debut = new Date(dateDebut)
  const fin = new Date(dateFin)
  const debutJour = new Date(
    debut.getFullYear(),
    debut.getMonth(),
    debut.getDate(),
  )
  const finJour = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
  const difference = finJour.getTime() - debutJour.getTime()
  const nombreJours = Math.floor(difference / (1000 * 60 * 60 * 24)) + 1
  const heureDebut = debut.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const heureFin = fin.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${heureDebut} - ${heureFin} • ${nombreJours} jours`
}

export function formaternombrejours(
  dateDebut: string,
  dateFin: string,
): string {
  const debut = new Date(dateDebut)
  const fin = new Date(dateFin)
  const debutJour = new Date(
    debut.getFullYear(),
    debut.getMonth(),
    debut.getDate(),
  )
  const finJour = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
  const difference = finJour.getTime() - debutJour.getTime()
  const nombreJours = Math.floor(difference / (1000 * 60 * 60 * 24)) + 1

  return ` ${nombreJours} `
}

export function calculerAge(dateNaissance: string) {
  const naissance = new Date(dateNaissance)
  const aujourdHui = new Date()

  let age = aujourdHui.getFullYear() - naissance.getFullYear()

  const mois = aujourdHui.getMonth() - naissance.getMonth()

  if (mois < 0 || (mois === 0 && aujourdHui.getDate() < naissance.getDate())) {
    age--
  }

  return age
}
