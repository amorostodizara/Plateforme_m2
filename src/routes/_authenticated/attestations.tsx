// import { useState } from "react";
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  BadgeCheck,
  CalendarDays,
  Download,
  GraduationCap,
  ShieldCheck,
  X,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { SqueletteGrilleCartes } from '@/components/app/Squelette'
import { dateFr } from '@/components/app/AdminKit'
import {
  genererAttestationPdf,
  telechargerAttestationPdf,
} from '@/lib/attestation-pdf'
import { useProfilCourant } from '@/components/app/AppShell'

import type { DonneesAttestation } from '@/lib/attestation-pdf'

export const Route = createFileRoute('/_authenticated/attestations')({
  head: () => ({
    meta: [
      { title: 'Mes attestations ' },
      {
        name: 'description',
        content:
          'Consultez, téléchargez et vérifiez vos attestations de formation.',
      },
      {
        property: 'og:title',
        content: 'Mes attestations ',
      },
      {
        property: 'og:description',
        content: 'Attestations délivrées après réussite des évaluations.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Attestations,
})

type Attestation = {
  attestation_id: number
  inscription_id: number
  numero_attestation: string | null
  jeton_verification: string | null
  delivree_le: string
  statut: 'Valide' | 'Invalide' | 'Annulée'
  inscription: {
    participant: { utilisateur: { nom: string; prenoms: string } | null } | null
    session: {
      nom_session: string
      date_debut: string
      date_fin: string
      formation: { titre: string; description: string } | null
    } | null
  } | null
}

type Resultat = {
  inscription_id: number
  score: number | null
  reussi: boolean
  evaluation: { score_reussite: number } | null
}

type Modele = {
  titre_attestation: string
  texte_attestation: string | null
  nom_signataire: string | null
  fonction_signataire: string | null
  pied_de_page: string | null
  couleur_principale: string
}

const couleur: Record<string, string> = {
  Valide: 'bg-[#E6F4EA] text-[#137333]',
  Invalide: 'bg-secondary text-muted-foreground',
  Annulée: 'bg-[#FCE8E6] text-[#C5221F]',
}

function Attestations() {
  const [apercu, setApercu] = useState<Attestation | null>(null)
  const [verification, setVerification] = useState<Attestation | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const { data: profil, isLoading: chargementProfil } = useProfilCourant()

  const { data: attestations = [], isLoading: chargementAttestations } =
    useQuery({
      queryKey: ['mes-attestations', profil?.participant_id],
      enabled: profil?.participant_id != null,
      queryFn: async () => {
        if (!profil?.participant_id) return []

        const { data, error } = await supabase
          .from('attestation')
          .select(
            `
        attestation_id,
        inscription_id,
        numero_attestation,
        jeton_verification,
        delivree_le,
        statut,
        inscription:inscription!inner(
          participant_id,
          participant:participant(
            utilisateur:utilisateur(nom, prenoms ) ), session:session_formation( nom_session,date_debut, date_fin,formation:formation(titre,description)  ) ) `,
          )
          .eq('inscription.participant_id', profil.participant_id)
          .order('delivree_le', { ascending: false })

        if (error) throw error
        return (data ?? []) as unknown as Attestation[]
      },
    })

  const { data: modele } = useQuery({
    queryKey: ['modele-attestation'],
    queryFn: async () => {
      const { data } = await supabase
        .from('modele_attestation')
        .select(
          'titre_attestation, texte_attestation, nom_signataire, fonction_signataire, pied_de_page, couleur_principale',
        )
        .eq('actif', true)
        .maybeSingle()
      return (data ?? null) as Modele | null
    },
  })

  // Notes obtenues : l’attestation n’est téléchargeable qu’après une évaluation réussie.
  const { data: resultats = [] } = useQuery({
    queryKey: ['mes-resultats-evaluations', profil?.participant_id],
    enabled: profil?.participant_id != null,
    queryFn: async () => {
      if (!profil?.participant_id) return []

      const { data, error } = await supabase
        .from('tentative_evaluation')
        .select(
          `
        inscription_id,
        score,
        reussi,
        evaluation:evaluation(
          score_reussite
        ),
        inscription:inscription!inner(
          participant_id
        )
      `,
        )
        .eq('inscription.participant_id', profil.participant_id)
        .eq('reussi', true)
        .order('score', { ascending: false })

      if (error) throw error

      return (data ?? []) as unknown as Resultat[]
    },
  })

  function construireDonneesAttestation(a: Attestation): DonneesAttestation {
    const r = resultatDe(a.inscription_id)
    const u = a.inscription?.participant?.utilisateur

    return {
      numero: a.numero_attestation ?? `ATT-${a.attestation_id}`,
      participant:
        `${u?.prenoms ?? ''} ${u?.nom ?? ''}`.trim() || 'Participant',
      formation: a.inscription?.session?.formation?.titre ?? 'Formation',
      session: a.inscription?.session?.nom_session ?? 'Session de formation',
      dateDebut: a.inscription?.session?.date_debut ?? null,
      dateFin: a.inscription?.session?.date_fin ?? null,
      delivreeLe: a.delivree_le,
      note: r?.score ?? null,
      scoreRequis: r?.evaluation?.score_reussite ?? null,
      jeton: a.jeton_verification,
      titre: modele?.titre_attestation ?? 'Attestation de formation',
      texte:
        modele?.texte_attestation ??
        'Le présent certificat atteste que son titulaire a suivi avec succès cette formation chez Orange DIgital Center Madagascar.',
      signataire: modele?.nom_signataire ?? 'ANDRIANALISON HOMENTSOA Lalaina',
      fonctionSignataire:
        modele?.fonction_signataire ?? 'Directrice Orange Digital Center',
      piedDePage:
        modele?.pied_de_page ??
        'Document officiel délivré par Orange Digital Center.',
      couleur: modele?.couleur_principale ?? '#FF7900',
      lienVerification: `${window.location.origin}/attestations?verification=${a.jeton_verification ?? ''}`,
      description: a.inscription?.session?.formation?.description ?? null,
    }
  }

  useEffect(() => {
    if (!apercu) {
      setPdfUrl(null)
      return
    }
    let currentUrl: string | null = null
    let cancelled = false
    const genererApercuPdf = async () => {
      const donnees = construireDonneesAttestation(apercu)
      const pdf = await genererAttestationPdf(donnees)
      if (cancelled) return
      const blob = pdf.output('blob')
      currentUrl = URL.createObjectURL(blob)
      setPdfUrl(currentUrl)
    }
    void genererApercuPdf()
    return () => {
      cancelled = true

      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [apercu, modele, resultats])

  const resultatDe = (inscriptionId: number) =>
    resultats.find((r) => r.inscription_id === inscriptionId) ?? null
  const estTelechargeable = (a: Attestation) =>
    a.statut === 'Valide' && resultatDe(a.inscription_id) !== null

  async function telecharger(a: Attestation) {
    if (!estTelechargeable(a)) {
      toast.error(
        'L’attestation sera téléchargeable après la réussite de l’évaluation et sa validation.',
      )
      return
    }
    const donnees = construireDonneesAttestation(a)
    await telechargerAttestationPdf(donnees)
    toast.success('Attestation téléchargée au format PDF.')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mes attestations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attestations délivrées après la réussite des évaluations de formation.
        </p>
      </div>

      {chargementProfil || chargementAttestations ? (
        <SqueletteGrilleCartes nombre={3} />
      ) : attestations.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-input bg-card p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-primary">
            <Award className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-base font-bold text-foreground">
            Aucune formation validée
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Votre attestation apparaîtra ici après la réussite d’une évaluation
            et la validation de la formation.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attestations.map((a) => (
            <article
              key={a.attestation_id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
            >
              <div className="h-1 bg-primary" />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${couleur[a.statut] ?? ''}`}
                  >
                    {a.statut}
                  </span>
                </div>
                <p className="mt-4 text-base font-bold text-foreground">
                  {a.inscription?.session?.formation?.titre ??
                    'Formation validée'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.inscription?.session?.nom_session ??
                    'Session de formation'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Délivrée le</p>
                    <p className="mt-1 flex items-center gap-1 font-semibold text-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {dateFr(a.delivree_le)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Numéro</p>
                    <p className="mt-1 truncate font-semibold text-foreground">
                      {a.numero_attestation ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setApercu(a)}
                    className="h-9 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => telecharger(a)}
                    disabled={!estTelechargeable(a)}
                    title={
                      estTelechargeable(a)
                        ? 'Télécharger le PDF'
                        : 'Disponible après validation de l’évaluation'
                    }
                    className="flex h-9 items-center justify-center gap-1 rounded-md border border-input text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    onClick={() => setVerification(a)}
                    className="flex h-9 items-center justify-center gap-1 rounded-md border border-input text-xs font-semibold hover:bg-secondary"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Vérifier
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {apercu ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-foreground/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-bold text-foreground">
                Aperçu de l’attestation
              </h2>
              <button
                onClick={() => setApercu(null)}
                className="rounded-md p-1 hover:bg-secondary"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex justify-center rounded-lg bg-muted/30 p-4">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="Aperçu de l’attestation"
                  className="aspect-[297/210] w-full max-w-5xl rounded-md bg-white"
                />
              ) : (
                <div className="flex aspect-[297/210] w-full max-w-5xl items-center justify-center rounded-md border bg-white">
                  <p className="text-sm text-muted-foreground">
                    {' '}
                    Génération de l’aperçu...{' '}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => telecharger(apercu)}
                disabled={!estTelechargeable(apercu)}
                className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Télécharger le PDF
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {verification ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Vérification de l’attestation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Authenticité et statut du document.
                </p>
              </div>
              <button
                onClick={() => setVerification(null)}
                className="rounded-md p-1 hover:bg-secondary"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-md bg-cream p-4 text-primary">
              <BadgeCheck className="h-7 w-7" />
              <div>
                <p className="font-bold">
                  Attestation {verification.statut.toLowerCase()}
                </p>
                <p className="text-xs">
                  {verification.inscription?.session?.formation?.titre}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Numéro unique</dt>
                <dd className="font-semibold text-foreground">
                  {verification.numero_attestation ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Code de vérification</dt>
                <dd className="break-all font-semibold text-foreground">
                  {verification.jeton_verification ?? '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}
