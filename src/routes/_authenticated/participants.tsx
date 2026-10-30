import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, QrCode, Search, Trash2 } from 'lucide-react'
import { BadgeQr } from '@/components/app/BadgeQr'

import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { SqueletteLignesTableau } from '@/components/app/Squelette'
import {
  CarteStat,
  EnteteAdmin,
  Etiquette,
  LigneInfo,
  MenuActions,
  PanneauDetail,
  SectionPanneau,
  champClass,
  dateFr,
  labelClass,
  selectClass,
  LabelObligatoire,
  calculerAge,
  dateHeureFr,
} from '@/components/app/AdminKit'
import { useDroits } from '@/components/app/AppShell'

export const Route = createFileRoute('/_authenticated/participants')({
  head: () => ({
    meta: [
      { title: 'Participants ' },
      {
        name: 'description',
        content:
          'Gérez les participants et consultez tout leur parcours de formation.',
      },
      { property: 'og:title', content: 'Participants ' },
      {
        property: 'og:description',
        content:
          'Gérez les participants et consultez tout leur parcours de formation.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Page,
})

type Participant = {
  participant_id: number
  utilisateur_id: number
  date_naissance: string | null
  codeqr_jeton: string | null

  utilisateur: {
    nom: string
    prenoms: string
    email: string
    telephone: string | null
    adresse: string | null
    genre: string | null
    statut: string
  } | null
  profil_professionnel:
    | {
        statut_actuel: string | null
        institution: string | null
        specialisation: string | null
        mention: string | null
        niveau_education: string | null
      }[]
    | null
}

type Parcours = {
  inscription_id: number
  date_inscription: string
  motivation: string | null
  engagement: boolean | null
  statut: string
  session: {
    nom_session: string
    date_debut: string
    date_fin: string
    lieu: string | null
    formation: { titre: string } | null
  } | null
  presences:
    | {
        presence_id: number
        enregistre_le: string
        statut: string
        methode: string
      }[]
    | null
  tentatives:
    | {
        tentative_evaluation_id: number
        numero_tentative: number
        score: number | null
        statut: string
        reussi: boolean
        evaluation: { titre_evaluation: string } | null
      }[]
    | null
  attestations:
    | {
        attestation_id: number
        numero_attestation: string | null
        delivree_le: string
        statut: string
        url_fichier: string | null
      }[]
    | null
}

const profilVide = {
  telephone: '',
  adresse: '',
  genre: '',
  date_naissance: '',
  statut_actuel: '',
  institution: '',
  specialisation: '',
  mention: '',
  niveau_education: '',
}

function Page() {
  const queryClient = useQueryClient()
  const [edite, setEdite] = useState<Participant | null>(null)
  const [form, setForm] = useState(profilVide)
  const [recherche, setRecherche] = useState('')
  const [detail, setDetail] = useState<Participant | null>(null)
  const [onglet, setOnglet] = useState<
    'synthese' | 'inscriptions' | 'presences' | 'evaluations' | 'attestations'
  >('synthese')
  const [badge, setBadge] = useState<Participant | null>(null)
  const { estGestionnaire } = useDroits()

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['admin-participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participant')
        .select(
          'participant_id, utilisateur_id, date_naissance, codeqr_jeton, utilisateur:utilisateur(nom, prenoms, email, telephone, adresse, genre, statut), profil_professionnel:profil_professionnel(statut_actuel, institution, specialisation, mention, niveau_education)',
        )

      if (error) throw error
      const liste = <T,>(v: T | T[] | null) =>
        v == null ? [] : Array.isArray(v) ? v : [v]
      return ((data ?? []) as unknown as Participant[]).map((p) => ({
        ...p,
        profil_professionnel: liste(p.profil_professionnel),
      }))
    },
  })

  const { data: parcours = [] } = useQuery({
    queryKey: ['participant-parcours', detail?.participant_id],
    enabled: !!detail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscription')
        .select(
          'inscription_id, date_inscription, motivation, engagement, statut, session:session_formation(nom_session, date_debut, date_fin, lieu, formation:formation(titre)), presences:presence(presence_id, enregistre_le, statut, methode), tentatives:tentative_evaluation(tentative_evaluation_id, numero_tentative, score, statut, reussi, evaluation:evaluation(titre_evaluation)), attestations:attestation(attestation_id, numero_attestation, delivree_le, statut, url_fichier)',
        )
        .eq('participant_id', detail!.participant_id)
        .order('date_inscription', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Parcours[]
    },
  })

  const enregistrerProfil = useMutation({
    mutationFn: async () => {
      if (!form.telephone.trim() || !form.adresse || !form.genre) {
        throw new Error(
          "Le téléphone, l'adresse et le genre ne doivent pas être vides.",
        )
      }
      if (
        !form.date_naissance ||
        !form.statut_actuel ||
        !form.institution ||
        !form.niveau_education
      ) {
        throw new Error(
          "La date de naissance, le statut, l'institution et le niveau d'étude ne doivent pas être vides.",
        )
      }
      // Téléphone : exactement 10 chiffres et commence par 03
      if (!/^03\d{8}$/.test(form.telephone)) {
        throw new Error(
          'Le numéro doit contenir exactement 10 chiffres et commencer par 03.',
        )
      }
      // Âge minimum : 10 ans
      if (calculerAge(form.date_naissance) < 10) {
        throw new Error('Le participant doit avoir au minimum 10 ans.')
      }
      const p = edite!
      const { error: e1 } = await supabase
        .from('utilisateur')
        .update({
          telephone: form.telephone,
          adresse: form.adresse,
          genre: form.genre as 'Homme' | 'Femme',
        })
        .eq('utilisateur_id', p.utilisateur_id)

      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('participant')
        .update({
          date_naissance: form.date_naissance,
        })
        .eq('participant_id', p.participant_id)
      if (e2) throw e2
      const valeurs = {
        participant_id: p.participant_id,
        statut_actuel: form.statut_actuel as never,
        institution: form.institution,
        specialisation: form.specialisation || null,
        mention: form.mention || null,
        niveau_education: form.niveau_education as never,
      }
      const { error: e3 } = (p.profil_professionnel ?? []).length
        ? await supabase
            .from('profil_professionnel')
            .update(valeurs)
            .eq('participant_id', p.participant_id)
        : await supabase.from('profil_professionnel').insert(valeurs)

      if (e3) throw e3
    },
    onSuccess: () => {
      toast.success('Profil du participant mis à jour.')
      setEdite(null)
      queryClient.invalidateQueries({
        queryKey: ['admin-participants'],
      })
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('participant')
        .delete()
        .eq('participant_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Participant supprimé.')
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['admin-participants'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function ouvrirEdition(p: Participant) {
    const pp = p.profil_professionnel?.[0]
    setForm({
      telephone: p.utilisateur?.telephone ?? '',
      adresse: p.utilisateur?.adresse ?? '',
      genre: p.utilisateur?.genre ?? '',
      date_naissance: p.date_naissance ?? '',
      statut_actuel: pp?.statut_actuel ?? '',
      institution: pp?.institution ?? '',
      specialisation: pp?.specialisation ?? '',
      mention: pp?.mention ?? '',
      niveau_education: pp?.niveau_education ?? '',
    })
    setEdite(p)
  }

  const affiches = useMemo(
    () =>
      participants.filter((p) => {
        const champ =
          `${p.utilisateur?.prenoms ?? ''} ${p.utilisateur?.nom ?? ''} ${p.utilisateur?.email ?? ''} ${p.utilisateur?.telephone ?? ''}`.toLowerCase()
        return !recherche || champ.includes(recherche.toLowerCase())
      }),
    [participants, recherche],
  )

  const presences = parcours.flatMap((p) =>
    (p.presences ?? []).map((pr) => ({
      ...pr,
      formation: p.session?.formation?.titre,
      session: p.session?.nom_session,
    })),
  )
  const tentatives = parcours.flatMap((p) =>
    (p.tentatives ?? []).map((t) => ({
      ...t,
      formation: p.session?.formation?.titre,
      session: p.session?.nom_session,
    })),
  )
  const attestations = parcours.flatMap((p) =>
    (p.attestations ?? []).map((a) => ({
      ...a,
      formation: p.session?.formation?.titre,
      session: p.session?.nom_session,
    })),
  )
  const pro = detail?.profil_professionnel?.[0]
  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Gestion des participants"
        description="Informations personnelles, profil professionnel et parcours complet sur la plateforme."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Participants"
          valeur={participants.length}
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Comptes actifs"
          valeur={
            participants.filter((p) => p.utilisateur?.statut === 'Actif').length
          }
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Profils professionnels"
          valeur={
            participants.filter(
              (p) => (p.profil_professionnel ?? []).length > 0,
            ).length
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un participant"
            className={`${champClass} pl-9`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {[
                  'Participant',
                  'Contact',
                  'Adresse',
                  'Statut actuel',
                  'Institution',
                  'Niveau',
                  'Compte',
                  'Actions',
                ].map((t) => (
                  <th
                    key={t}
                    className="px-3 py-3 text-xs font-bold text-muted-foreground"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SqueletteLignesTableau colonnes={8} />
              ) : affiches.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucun participant.
                  </td>
                </tr>
              ) : (
                affiches.map((p) => {
                  const pp = p.profil_professionnel?.[0]
                  return (
                    <tr
                      key={p.participant_id}
                      onClick={() => {
                        setDetail(p)
                        setOnglet('synthese')
                      }}
                      className="cursor-pointer border-t border-border hover:bg-secondary/50"
                    >
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">
                          {p.utilisateur
                            ? `${p.utilisateur.prenoms} ${p.utilisateur.nom}`
                            : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.utilisateur?.email}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {p.utilisateur?.telephone ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {p.utilisateur?.adresse ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {pp?.statut_actuel ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {pp?.institution ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {pp?.niveau_education ?? '—'}
                      </td>
                      <td className="px-3 py-3">
                        <Etiquette valeur={p.utilisateur?.statut} />
                      </td>
                      <td
                        className="px-3 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MenuActions>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setDetail(p)
                              setOnglet('synthese')
                            }}
                          >
                            <Eye /> Voir le parcours
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => ouvrirEdition(p)}
                          >
                            <Pencil /> Modifier le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => setBadge(p)}
                          >
                            <QrCode /> Voir le badge QR
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {estGestionnaire && (
                            <DropdownMenuItem
                              onClick={() => supprimer.mutate(p.participant_id)}
                              className="background-delete cursor-pointer"
                            >
                              <Trash2 /> Supprimer
                            </DropdownMenuItem>
                          )}
                        </MenuActions>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <PanneauDetail
          titre={
            detail.utilisateur
              ? `${detail.utilisateur.prenoms} ${detail.utilisateur.nom}`
              : 'Participant'
          }
          sousTitre={detail.utilisateur?.email}
          onFermer={() => setDetail(null)}
        >
          <SectionPanneau titre="Participant">
            <LigneInfo
              libelle="Téléphone"
              valeur={detail.utilisateur?.telephone}
            />
            <LigneInfo libelle="Adresse" valeur={detail.utilisateur?.adresse} />
            <LigneInfo libelle="Genre" valeur={detail.utilisateur?.genre} />
            <LigneInfo
              libelle="Date de naissance"
              valeur={dateFr(detail.date_naissance)}
            />
            <LigneInfo libelle="Statut actuel" valeur={pro?.statut_actuel} />
            <LigneInfo libelle="Institution" valeur={pro?.institution} />
            <LigneInfo libelle="Spécialisation" valeur={pro?.specialisation} />
            <LigneInfo
              libelle="Niveau d’étude"
              valeur={pro?.niveau_education}
            />
          </SectionPanneau>

          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ['synthese', 'Synthèse'],
                ['inscriptions', 'Inscriptions'],
                ['presences', 'Présences'],
                ['evaluations', 'Évaluations'],
                ['attestations', 'Attestations'],
              ] as const
            ).map(([cle, libelle]) => (
              <button
                key={cle}
                onClick={() => setOnglet(cle)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${onglet === cle ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                {libelle}
              </button>
            ))}
          </div>

          {onglet === 'synthese' ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Inscriptions', parcours.length],
                [
                  'Formations suivies',
                  new Set(
                    parcours
                      .map((p) => p.session?.formation?.titre)
                      .filter(Boolean),
                  ).size,
                ],
                [
                  'Présences',
                  presences.filter((p) => p.statut === 'Présent').length,
                ],
                [
                  'Évaluations réussies',
                  tentatives.filter((t) => t.reussi).length,
                ],
                ['Attestations', attestations.length],
              ].map(([l, v]) => (
                <div
                  key={l as string}
                  className="rounded-md bg-secondary p-3 text-center"
                >
                  <p className="text-xl font-bold text-foreground">{v}</p>
                  <p className="text-[10px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
          ) : null}

          {onglet === 'inscriptions' ? (
            <SectionPanneau titre={`Inscriptions (${parcours.length})`}>
              {parcours.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune inscription.
                </p>
              ) : (
                parcours.map((p) => (
                  <div
                    key={p.inscription_id}
                    className="rounded-md border border-border p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold">
                        {p.session?.formation?.titre ?? '—'}
                      </p>
                      <Etiquette valeur={p.statut} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {p.session?.nom_session} · inscrit le{' '}
                      {dateHeureFr(p.date_inscription)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Engagement : {p.engagement ? 'oui' : 'non'}
                    </p>
                    {p.motivation ? (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">
                        « {p.motivation} »
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </SectionPanneau>
          ) : null}

          {onglet === 'presences' ? (
            <SectionPanneau titre={`Présences (${presences.length})`}>
              {presences.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune présence enregistrée.
                </p>
              ) : (
                presences.map((p) => (
                  <div
                    key={p.presence_id}
                    className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {p.formation ?? '—'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {dateHeureFr(p.enregistre_le)} · {p.methode}
                      </p>
                    </div>
                    <Etiquette valeur={p.statut} />
                  </div>
                ))
              )}
            </SectionPanneau>
          ) : null}

          {onglet === 'evaluations' ? (
            <SectionPanneau titre={`Évaluations (${tentatives.length})`}>
              {tentatives.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune évaluation passée.
                </p>
              ) : (
                tentatives.map((t) => (
                  <div
                    key={t.tentative_evaluation_id}
                    className="rounded-md border border-border p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold">
                        {t.evaluation?.titre_evaluation ?? '—'}
                      </p>
                      <Etiquette valeur={t.reussi ? 'Valide' : 'Refusée'} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t.formation} · tentative {t.numero_tentative} · score{' '}
                      {t.score ?? '—'} · {t.statut}
                    </p>
                  </div>
                ))
              )}
            </SectionPanneau>
          ) : null}

          {onglet === 'attestations' ? (
            <SectionPanneau titre={`Attestations (${attestations.length})`}>
              {attestations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune attestation.
                </p>
              ) : (
                attestations.map((a) => (
                  <div
                    key={a.attestation_id}
                    className="rounded-md border border-border p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold">
                        {a.formation ?? '—'}
                      </p>
                      <Etiquette valeur={a.statut} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      N° {a.numero_attestation ?? '—'} · délivrée le{' '}
                      {dateFr(a.delivree_le)}
                    </p>
                    {a.url_fichier ? (
                      <a
                        href={a.url_fichier}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Ouvrir le PDF
                      </a>
                    ) : null}
                  </div>
                ))
              )}
            </SectionPanneau>
          ) : null}
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => ouvrirEdition(detail)}
          >
            <Pencil /> Modifier le profil
          </Button>
        </PanneauDetail>
      ) : null}

      <Dialog open={!!edite} onOpenChange={(o) => !o && setEdite(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le profil du participant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Téléphone <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
                placeholder="Ex: 0320711038"
              />
            </div>
            <div>
              <label className={labelClass}>
                Adresse
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Ex: Tanambao-Fianarantsoa"
              />
            </div>
            <div>
              <label className={labelClass}>
                Genre
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
              >
                <option value="">Non précisé</option>
                {['Homme', 'Femme'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Date de naissance
                <LabelObligatoire />
              </label>
              <input
                type="date"
                className={champClass}
                value={form.date_naissance}
                onChange={(e) =>
                  setForm({ ...form, date_naissance: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Statut actuel
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.statut_actuel}
                onChange={(e) =>
                  setForm({ ...form, statut_actuel: e.target.value })
                }
              >
                <option value="">Non précisé</option>
                {[
                  'Étudiant',
                  'Employé',
                  'Fonctionnaire',
                  'Chômeur',
                  'Indépendant',
                  'Entrepreneur',
                  'Autre',
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Niveau d’étude
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.niveau_education}
                onChange={(e) =>
                  setForm({ ...form, niveau_education: e.target.value })
                }
              >
                <option value="">Non précisé</option>
                {[
                  'BEPC',
                  'BAC',
                  'L1',
                  'L2',
                  'L3',
                  'M1',
                  'M2',
                  'Doctorat',
                  'Autre',
                ].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Institution / Etablissement <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.institution}
                onChange={(e) =>
                  setForm({ ...form, institution: e.target.value })
                }
                placeholder="Ex: Orange Madagascar"
              />
            </div>
            <div>
              <label className={labelClass}>Spécialisation</label>
              <input
                className={champClass}
                value={form.specialisation}
                onChange={(e) =>
                  setForm({ ...form, specialisation: e.target.value })
                }
                placeholder="Ex: Développeur web"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Mention</label>
              <input
                className={champClass}
                value={form.mention}
                onChange={(e) => setForm({ ...form, mention: e.target.value })}
                placeholder="Ex: Informatique"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdite(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => enregistrerProfil.mutate()}
              disabled={enregistrerProfil.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BadgeQr
        ouvert={badge !== null}
        onOuvertChange={(o) => {
          if (!o) setBadge(null)
        }}
        jeton={badge?.codeqr_jeton ?? null}
        nom={
          badge?.utilisateur
            ? `${badge.utilisateur.prenoms} ${badge.utilisateur.nom}`
            : ''
        }
        sousTitre={badge?.utilisateur?.email ?? ''}
      />
    </div>
  )
}
