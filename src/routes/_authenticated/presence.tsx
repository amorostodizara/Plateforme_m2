import { useCallback, useMemo, useState } from 'react'
import { ImageStockee } from '@/components/app/ImageStockee'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  CalendarDays,
  Filter,
  GraduationCap,
  Mail,
  MoreHorizontal,
  Phone,
  QrCode,
  Search,
  Settings2,
  User,
  UserCheck,
  UserX,
  Users,
  X,
  Download,
} from 'lucide-react'
import { genererFichePresencePdf } from '@/lib/presence-pdf'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { ScannerQr } from '@/components/app/ScannerQr'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SqueletteLignesTableau } from '@/components/app/Squelette'
import { BadgeQr } from '@/components/app/BadgeQr'
import { dateHeureFr, dateFr } from '@/components/app/AdminKit'
import { AccesReserve } from '@/components/app/Acces'
import { SelectRecherche } from '@/components/auth/select-recherche'
export const Route = createFileRoute('/_authenticated/presence')({
  head: () => ({
    meta: [
      { title: 'Gestion des présences ' },
      {
        name: 'description',
        content:
          'Suivez et enregistrez la présence des participants aux sessions de formation.',
      },
      {
        property: 'og:title',
        content: 'Gestion des présences ',
      },
      {
        property: 'og:description',
        content:
          'Scanner de badge et suivi de présence par session de formation.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR', 'RESPONSABLE']}>
      <Presence />
    </AccesReserve>
  ),
})

type Statut = 'Présent' | 'Absent'
type Methode = 'QR Code' | 'Manuel' | 'Système'

type PresenceLigne = {
  presence_id: number
  date_presence: string
  enregistre_le: string
  statut: Statut
  methode: Methode
  remarque: string | null
}

type Ligne = {
  inscription_id: number
  session: {
    session_id: number
    nom_session: string
    date_debut: string
    date_fin: string
    formation: { titre: string } | null
  } | null
  participant: {
    participant_id: number
    codeqr_jeton: string | null
    utilisateur: {
      nom: string
      prenoms: string
      email: string
      telephone: string | null
      url_profil: string | null
    } | null
    profil_professionnel:
      | {
          statut_actuel: string | null
          institution: string | null
          specialisation: string | null
          niveau_education: string | null
        }[]
      | null
  } | null
  presence: PresenceLigne[] | null
}

type SessionItem = {
  session_id: number
  nom_session: string
  date_debut: string
  date_fin: string
}

const jourIso = (d: Date) => d.toISOString().slice(0, 10)

const couleurStatut: Record<Statut, string> = {
  Présent: 'bg-[#E6F4EA] text-[#137333]',
  Absent: 'bg-[#FCE8E6] text-[#C5221F]',
}

function Presence() {
  const queryClient = useQueryClient()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [jour, setJour] = useState<string>('Toutes')
  const [filtreStatut, setFiltreStatut] = useState<'Tous' | Statut>('Tous')
  const [recherche, setRecherche] = useState('')
  const [detail, setDetail] = useState<Ligne | null>(null)
  const [remarque, setRemarque] = useState('')
  const [badgeOuvert, setBadgeOuvert] = useState(false)

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-presence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_formation')
        .select('session_id, nom_session, date_debut, date_fin')
        .order('date_debut', { ascending: false })
      if (error) throw error
      return (data ?? []) as SessionItem[]
    },
  })

  const {
    data: lignes = [],
    isLoading,
    isFetching: actualisationEnCours,
  } = useQuery({
    queryKey: ['presences', sessionId],
    enabled: sessionId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscription')
        .select(
          'inscription_id, session:session_formation(session_id, nom_session, date_debut, date_fin, formation:formation(titre)), participant:participant(participant_id, codeqr_jeton, utilisateur:utilisateur(nom, prenoms, email, telephone, url_profil), profil_professionnel:profil_professionnel(statut_actuel, institution, specialisation, niveau_education)), presence:presence(presence_id, date_presence,enregistre_le, statut, methode, remarque)',
        )
        .eq('session_id', sessionId!)
        .eq('statut', 'Acceptée')
      if (error) throw error
      const liste = <T,>(v: T | T[] | null) =>
        v == null ? [] : Array.isArray(v) ? v : [v]
      return ((data ?? []) as unknown as Ligne[]).map((l) =>
        l.participant
          ? {
              ...l,
              participant: {
                ...l.participant,
                profil_professionnel: liste(l.participant.profil_professionnel),
              },
            }
          : l,
      )
    },
  })

  const sessionActive = sessions.find((s) => s.session_id === sessionId) ?? null

  const jours = useMemo(() => {
    if (!sessionActive) return [] as string[]
    const out: string[] = []
    const d = new Date(sessionActive.date_debut)
    const fin = new Date(sessionActive.date_fin)
    while (d <= fin && out.length < 60) {
      out.push(jourIso(d))
      d.setDate(d.getDate() + 1)
    }
    return out
  }, [sessionActive])

  const presenceDe = useCallback(
    (l: Ligne): PresenceLigne | null => {
      if (jour === 'Toutes') return null

      return (
        (l.presence ?? []).find((p) => p.date_presence === jour) ?? {
          presence_id: 0,
          date_presence: jour,
          enregistre_le: jour,
          statut: 'Absent',
          methode: 'Système',
          remarque: null,
        }
      )
    },
    [jour],
  )

  const enregistrer = useMutation({
    mutationFn: async ({
      inscriptionId,
      statut,
      methode,
      remarque: note,
    }: {
      inscriptionId: number
      statut: Statut
      methode: Methode
      remarque?: string
    }) => {
      if (jour === 'Toutes') {
        throw new Error(
          'Sélectionnez une date de séance avant d’enregistrer une présence.',
        )
      }
      const date = jour === 'Toutes' ? jourIso(new Date()) : jour
      const { data: existante } = await supabase
        .from('presence')
        .select('presence_id')
        .eq('inscription_id', inscriptionId)
        .eq('date_presence', date)
        .maybeSingle()
      if (existante) {
        const { error } = await supabase
          .from('presence')
          .update({
            statut,
            methode,
            present: statut === 'Présent',
            ...(note !== undefined ? { remarque: note } : {}),
          })
          .eq('presence_id', existante.presence_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('presence').insert({
          inscription_id: inscriptionId,
          date_presence: date,
          present: statut === 'Présent',
          statut,
          methode,
          ...(note !== undefined ? { remarque: note } : {}),
        })
        if (error) throw error
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['presences', sessionId],
        exact: true,
        type: 'active',
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // const surCode = useCallback(
  //   (code: string) => {
  //     const cible = lignes.find(
  //       (l) =>
  //         l.participant?.codeqr_jeton === code ||
  //         String(l.participant?.participant_id) === code ||
  //         String(l.inscription_id) === code,
  //     )
  //     if (!cible) {
  //       toast.error(`Badge non reconnu pour cette session : ${code}`)
  //       return
  //     }
  //     enregistrer.mutate({
  //       inscriptionId: cible.inscription_id,
  //       statut: 'Présent',
  //       methode: 'QR Code',
  //     })
  //     const u = cible.participant?.utilisateur
  //     toast.success(
  //       `Présence enregistrée : ${u?.prenoms ?? ''} ${u?.nom ?? ''}`.trim(),
  //     )
  //   },
  //   [lignes, enregistrer],
  // )

  const surCode = useCallback(
    (code: string) => {
      const cible = lignes.find(
        (l) =>
          l.participant?.codeqr_jeton === code ||
          String(l.participant?.participant_id) === code ||
          String(l.inscription_id) === code,
      )

      if (!cible) {
        toast.error(`Badge non reconnu pour cette session : ${code}`)
        return
      }
      const u = cible.participant?.utilisateur
      toast.success(
        `Badge reconnu : ${u?.prenoms ?? ''} ${u?.nom ?? ''}`.trim(),
      )
      enregistrer.mutate({
        inscriptionId: cible.inscription_id,
        statut: 'Présent',
        methode: 'QR Code',
      })
    },
    [lignes, enregistrer],
  )

  const affichees = useMemo(() => {
    return lignes.filter((l) => {
      const p = presenceDe(l)

      if (filtreStatut !== 'Tous' && p?.statut !== filtreStatut) {
        return false
      }
      if (recherche) {
        const u = l.participant?.utilisateur
        const champ =
          `${u?.prenoms ?? ''} ${u?.nom ?? ''} ${u?.email ?? ''} ${u?.telephone ?? ''}`.toLowerCase()
        if (!champ.includes(recherche.toLowerCase())) return false
      }
      return true
    })
  }, [lignes, presenceDe, filtreStatut, recherche])

  const total = lignes.length
  const presents = lignes.filter(
    (l) => presenceDe(l)?.statut === 'Présent',
  ).length
  const absents = lignes.filter(
    (l) => presenceDe(l)?.statut === 'Absent',
  ).length
  // const nonEnregistres = total - presents - absents
  const pct = (n: number) =>
    total ? `${Math.round((n / total) * 100)}%` : '0%'

  const selectClass =
    'h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none'

  const entetes: { libelle: string; icone: typeof User }[] = [
    { libelle: 'Nom & Contact', icone: User },
    { libelle: 'Email', icone: Mail },
    { libelle: 'Formation', icone: GraduationCap },
    { libelle: 'Session', icone: CalendarDays },
    { libelle: 'Date', icone: CalendarDays },
    { libelle: 'Statut', icone: BadgeCheck },
    { libelle: 'Méthode', icone: QrCode },
    { libelle: 'Actions', icone: Settings2 },
  ]

  const detailPresence = detail ? presenceDe(detail) : null

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestion des présences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez et gérez la présence des participants aux différentes
            sessions de formation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
          <div className="relative min-w-64 flex-1">
            <SelectRecherche
              label="Session"
              placeholder="Sélectionner une session"
              placeholderRecherche="Rechercher une session..."
              clearable={false}
              options={sessions.map((s) => ({
                value: String(s.session_id),
                label: s.nom_session,
              }))}
              value={String(sessionId ?? '')}
              onChange={(value) => setSessionId(Number(value))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Début :{' '}
              {sessionActive ? dateHeureFr(sessionActive.date_debut) : '—'}
            </span>
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Fin : {sessionActive ? dateHeureFr(sessionActive.date_fin) : '—'}
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants inscrits <b className="text-foreground">{total}</b>
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Total participants */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Users className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                Total participants
              </p>

              <p className="text-2xl font-bold text-foreground">{total}</p>
            </div>
          </div>

          {/* Présents */}
          <div className="flex items-center gap-3 rounded-lg border border-[#137333]/20 bg-[#E6F4EA] text-[#137333] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full  ">
              <UserCheck className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs font-semibold tracking-wide  text-[#137333]">
                Présents
              </p>

              <p className="text-2xl font-bold text-[#137333]">{presents}</p>

              <p className="text-xs font-semibold  text-[#137333]">
                {pct(presents)}
              </p>
            </div>
          </div>

          {/* Absents */}
          <div className="flex items-center gap-3 rounded-lg border border-[#C5221F]/20 bg-[#FCE8E6] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE8E6] text-[#C5221F]">
              <UserX className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#C5221F]">
                Absents
              </p>
              <p className="text-2xl font-bold text-[#C5221F]">{absents}</p>
              <p className="text-xs font-semibold text-[#C5221F]">
                {pct(absents)}
              </p>
            </div>
          </div>
        </div>

        <ScannerQr onCode={surCode} />

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un participant (nom, contact, email)…"
              className="h-10 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <label>
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Statut de présence
            </span>
            <select
              className={selectClass}
              value={filtreStatut}
              onChange={(e) =>
                setFiltreStatut(e.target.value as typeof filtreStatut)
              }
            >
              <option value="Tous">Tous</option>
              <option value="Présent">Présent</option>
              <option value="Absent">Absent</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground">
              Date / Séance
            </span>
            <select
              className={selectClass}
              value={jour}
              onChange={(e) => setJour(e.target.value)}
            >
              <option value="Toutes">Toutes</option>
              {jours.map((j) => (
                <option key={j} value={j}>
                  {dateFr(j)}
                </option>
              ))}
            </select>
          </label>
          <span className="flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            {affichees.length} résultat(s)
          </span>
          <button
            type="button"
            disabled={
              !sessionActive || actualisationEnCours || enregistrer.isPending
            }
            onClick={() => {
              if (!sessionActive) return
              const joursPdf = jour === 'Toutes' ? jours : [jour]
              genererFichePresencePdf({
                session: sessionActive.nom_session,
                dateDebut: sessionActive.date_debut,
                dateFin: sessionActive.date_fin,
                jours: joursPdf,
                lignes: affichees.map((l) => {
                  const u = l.participant?.utilisateur
                  const statuts: Record<string, Statut> = {}
                  ;(l.presence ?? []).forEach((p) => {
                    statuts[p.date_presence.slice(0, 10)] = p.statut
                  })
                  return {
                    nom: u?.nom ?? '',
                    prenoms: u?.prenoms ?? '',
                    contact: u?.telephone ?? '',
                    email: u?.email ?? '',
                    statuts,
                  }
                }),
              })
            }}
            className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {actualisationEnCours || enregistrer.isPending
              ? 'Synchronisation...'
              : 'Exporter PDF'}
          </button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <p className="border-b border-border px-4 py-3 text-sm font-bold text-foreground">
            Liste des présences
          </p>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  {entetes.map(({ libelle, icone: Icone }) => (
                    <th
                      key={libelle}
                      className=" px-3 py-3 text-xs font-bold tracking-wide text-muted-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <Icone className="h-3.5 w-3.5" />
                        {libelle}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SqueletteLignesTableau colonnes={8} />
                ) : affichees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-muted-foreground">
                      Aucun participant accepté pour cette session.
                    </td>
                  </tr>
                ) : (
                  affichees.map((l) => {
                    const u = l.participant?.utilisateur
                    const p = presenceDe(l)
                    return (
                      <tr
                        key={l.inscription_id}
                        onClick={() => {
                          setDetail(l)
                          setRemarque(p?.remarque ?? '')
                        }}
                        className="cursor-pointer border-t border-border hover:bg-secondary/60"
                      >
                        <td className=" px-3 py-3">
                          <span className="block font-medium text-foreground">
                            {u ? `${u.prenoms} ${u.nom}` : '—'}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {u?.telephone ?? '—'}
                          </span>
                        </td>
                        <td className=" px-3 py-3 text-muted-foreground">
                          {u?.email ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {l.session?.formation?.titre ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {l.session?.nom_session ?? '—'}
                        </td>
                        <td className=" px-3 py-3 text-muted-foreground">
                          {p ? dateHeureFr(p.enregistre_le) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${couleurStatut[p?.statut ?? 'Absent']}`}
                          >
                            {p?.statut ?? '———'}
                          </span>
                        </td>
                        <td className=" px-3 py-3 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {p?.methode === 'QR Code' ? (
                              <QrCode className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                            {p?.methode ?? '—'}
                          </span>
                        </td>
                        <td
                          className="px-3 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger className="rounded-md p-1.5 hover:bg-secondary">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                Statut de présence
                              </DropdownMenuLabel>
                              {(['Présent', 'Absent'] as Statut[]).map((s) => (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  key={s}
                                  onClick={() =>
                                    enregistrer.mutate({
                                      inscriptionId: l.inscription_id,
                                      statut: s,
                                      methode: 'Manuel',
                                    })
                                  }
                                >
                                  {s}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-auto border-l border-border bg-card p-5 shadow-card xl:static xl:z-auto xl:w-80 xl:shrink-0 xl:rounded-lg xl:border">
          <div className="flex items-start justify-between">
            <h2 className="text-base font-bold text-foreground">
              Détails de la présence
            </h2>
            <button
              onClick={() => setDetail(null)}
              className="rounded-md p-1 hover:bg-secondary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            {detail.participant?.utilisateur?.url_profil ? (
              <ImageStockee
                src={detail.participant.utilisateur.url_profil}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {`${detail.participant?.utilisateur?.prenoms?.[0] ?? ''}${detail.participant?.utilisateur?.nom?.[0] ?? ''}`.toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-bold text-foreground">
                {detail.participant?.utilisateur?.prenoms}{' '}
                {detail.participant?.utilisateur?.nom}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  couleurStatut[detailPresence?.statut ?? 'Absent']
                }`}
              >
                {detailPresence?.statut ?? 'Absent'}
              </span>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            {detail.participant?.utilisateur?.telephone ?? '—'}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {detail.participant?.utilisateur?.email}
          </p>

          <Section titre="Informations du participant">
            <Ligne2
              k="Profil"
              v={
                detail.participant?.profil_professionnel?.[0]?.statut_actuel ??
                '—'
              }
            />
            <Ligne2
              k="Établissement"
              v={
                detail.participant?.profil_professionnel?.[0]?.institution ??
                '—'
              }
            />
            <Ligne2
              k="Niveau"
              v={
                detail.participant?.profil_professionnel?.[0]
                  ?.niveau_education ?? '—'
              }
            />
            <Ligne2
              k="Spécialisation"
              v={
                detail.participant?.profil_professionnel?.[0]?.specialisation ??
                '—'
              }
            />
            <button
              type="button"
              onClick={() => setBadgeOuvert(true)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary hover:bg-cream"
            >
              <QrCode className="h-4 w-4" /> Voir le badge QR
            </button>
          </Section>

          <BadgeQr
            ouvert={badgeOuvert}
            onOuvertChange={setBadgeOuvert}
            jeton={detail.participant?.codeqr_jeton ?? null}
            nom={`${detail.participant?.utilisateur?.prenoms ?? ''} ${detail.participant?.utilisateur?.nom ?? ''}`.trim()}
            sousTitre={detail.session?.formation?.titre ?? ''}
          />

          <Section titre="Formation & Session">
            <Ligne2 k="Formation" v={detail.session?.formation?.titre ?? '—'} />
            <Ligne2 k="Session" v={detail.session?.nom_session ?? '—'} />
            <Ligne2
              k="Début"
              v={detail.session ? dateHeureFr(detail.session.date_debut) : '—'}
            />
            <Ligne2
              k="Fin"
              v={detail.session ? dateHeureFr(detail.session.date_fin) : '—'}
            />
          </Section>

          <Section titre="Détail de la présence">
            <Ligne2
              k="Date"
              v={
                detailPresence ? dateHeureFr(detailPresence.enregistre_le) : '—'
              }
            />
            <Ligne2 k="Méthode" v={detailPresence?.methode ?? '—'} />
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Statut
              </p>
              <select
                className={`${selectClass} mt-1 w-full`}
                value={detailPresence?.statut ?? 'Absent'}
                onChange={(e) =>
                  enregistrer.mutate({
                    inscriptionId: detail.inscription_id,
                    statut: e.target.value as Statut,
                    methode: 'Manuel',
                  })
                }
              >
                <option value="Présent">Présent</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Remarque
              </p>
              <textarea
                value={remarque}
                onChange={(e) => setRemarque(e.target.value)}
                rows={3}
                placeholder="Aucune remarque"
                className="mt-1 w-full rounded-md border border-input bg-card p-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => {
                  enregistrer.mutate(
                    {
                      inscriptionId: detail.inscription_id,
                      statut: detailPresence?.statut ?? 'Absent',
                      methode: detailPresence?.methode ?? 'Manuel',
                      remarque,
                    },
                    { onSuccess: () => toast.success('Remarque enregistrée.') },
                  )
                }}
                className="mt-2 h-9 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Enregistrer la remarque
              </button>
            </div>
          </Section>
        </aside>
      ) : null}
    </div>
  )
}

function Section({
  titre,
  children,
}: {
  titre: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-5 border-t border-border pt-4">
      <p className="mb-2 text-xs font-bold tracking-wide text-foreground">
        {titre}
      </p>
      {children}
    </section>
  )
}

function Ligne2({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{k} :</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  )
}
