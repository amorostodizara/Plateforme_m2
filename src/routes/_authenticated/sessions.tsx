import { useMemo, useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SqueletteLignesTableau } from '@/components/app/Squelette'
import {
  CarteStat,
  EnteteAdmin,
  Etiquette,
  LigneInfo,
  PanneauDetail,
  SectionPanneau,
  champClass,
  dateHeureFr,
  labelClass,
  selectClass,
  formaternombrejours,
  LabelObligatoire,
} from '@/components/app/AdminKit'
import { AccesReserve } from '@/components/app/Acces'

import { SelectRecherche } from '@/components/auth/select-recherche'

export const Route = createFileRoute('/_authenticated/sessions')({
  head: () => ({
    meta: [
      { title: 'Gestion des sessions ' },
      {
        name: 'description',
        content:
          'Planifiez les sessions de formation et suivez leurs participants.',
      },
      {
        property: 'og:title',
        content: 'Gestion des sessions ',
      },
      {
        property: 'og:description',
        content:
          'Planifiez les sessions de formation et suivez leurs participants.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR', 'RESPONSABLE', 'FORMATEUR']}>
      <Page />
    </AccesReserve>
  ),
})

type StatutS = 'Planifiée' | 'En cours' | 'Terminée' | 'Annulée'

type Session = {
  session_id: number
  nom_session: string
  date_debut: string
  date_fin: string
  lieu: string | null
  capacite: number | null
  statut: StatutS
  formation_id: number
  formateur_id: number | null
  formation: { titre: string } | null
  formateur: {
    formateur_id: number
    utilisateur: { nom: string; prenoms: string } | null
  } | null
  inscriptions:
    | {
        inscription_id: number
        statut: string
        participant: {
          utilisateur: { nom: string; prenoms: string; email: string } | null
        } | null
      }[]
    | null
}

const vide = {
  nom_session: '',
  formation_id: '',
  formateur_id: '',
  date_debut: '',
  date_fin: '',
  lieu: '',
  capacite: '',
  statut: 'Planifiée' as StatutS,
}

const pourInput = (v: string) => new Date(v).toISOString().slice(0, 16)

function Page() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('Tous')
  const [ouvert, setOuvert] = useState(false)
  const [edite, setEdite] = useState<number | null>(null)
  const [form, setForm] = useState(vide)
  const [detail, setDetail] = useState<Session | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_formation')
        .select(
          'session_id, nom_session, date_debut, date_fin, lieu, capacite, statut, formation_id, formateur_id, formation:formation(titre), formateur:formateur(formateur_id, utilisateur:utilisateur(nom, prenoms)), inscriptions:inscription(inscription_id, statut, participant:participant(utilisateur:utilisateur(nom, prenoms, email)))',
        )
        .order('date_debut', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Session[]
    },
  })

  const { data: formations = [] } = useQuery({
    queryKey: ['liste-formations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formation')
        .select('formation_id, titre')
        .order('titre')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: formateurs = [] } = useQuery({
    queryKey: ['liste-formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formateur')
        .select('formateur_id, utilisateur:utilisateur(nom, prenoms)')
      if (error) throw error
      return (data ?? []) as unknown as {
        formateur_id: number
        utilisateur: { nom: string; prenoms: string } | null
      }[]
    },
  })

  const enregistrer = useMutation({
    mutationFn: async () => {
      if (
        !form.nom_session.trim() ||
        !form.formation_id ||
        !form.date_debut ||
        !form.date_fin ||
        !form.lieu
      )
        throw new Error(
          'Nom session, formation , dates et lieu sont obligatoires.',
        )
      const valeurs = {
        nom_session: form.nom_session.trim(),
        formation_id: Number(form.formation_id),
        formateur_id: form.formateur_id ? Number(form.formateur_id) : null,
        date_debut: new Date(form.date_debut).toISOString(),
        date_fin: new Date(form.date_fin).toISOString(),
        lieu: form.lieu || null,
        capacite: form.capacite ? Number(form.capacite) : null,
        statut: form.statut,
      }
      const { error } = edite
        ? await supabase
            .from('session_formation')
            .update(valeurs)
            .eq('session_id', edite)
        : await supabase.from('session_formation').insert(valeurs)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(edite ? 'Session modifiée.' : 'Session créée.')
      setOuvert(false)
      setEdite(null)
      setForm(vide)
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('session_formation')
        .delete()
        .eq('session_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Session supprimée.')
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const affichees = useMemo(
    () =>
      sessions.filter((s) => {
        if (statutFiltre !== 'Tous' && s.statut !== statutFiltre) return false
        const champ =
          `${s.nom_session} ${s.formation?.titre ?? ''} ${s.lieu ?? ''}`.toLowerCase()
        return !recherche || champ.includes(recherche.toLowerCase())
      }),
    [sessions, recherche, statutFiltre],
  )

  function ouvrirEdition(s: Session) {
    setEdite(s.session_id)
    setForm({
      nom_session: s.nom_session,
      formation_id: String(s.formation_id),
      formateur_id: s.formateur_id ? String(s.formateur_id) : '',
      date_debut: pourInput(s.date_debut),
      date_fin: pourInput(s.date_fin),
      lieu: s.lieu ?? '',
      capacite: s.capacite ? String(s.capacite) : '',
      statut: s.statut,
    })
    setOuvert(true)
  }

  const actualiserStatutsSessions = useMutation({
    mutationFn: async () => {
      const maintenant = new Date().toISOString()

      // Sessions à venir → Planifiée
      const { error: erreurPlanifiee } = await supabase
        .from('session_formation')
        .update({ statut: 'Planifiée' })
        .neq('statut', 'Annulée')
        .gt('date_debut', maintenant)

      if (erreurPlanifiee) throw erreurPlanifiee

      // Sessions actuellement en cours → En cours
      const { error: erreurEnCours } = await supabase
        .from('session_formation')
        .update({ statut: 'En cours' })
        .neq('statut', 'Annulée')
        .lte('date_debut', maintenant)
        .gt('date_fin', maintenant)

      if (erreurEnCours) throw erreurEnCours

      // Sessions terminées → Terminée
      const { error: erreurTerminee } = await supabase
        .from('session_formation')
        .update({ statut: 'Terminée' })
        .neq('statut', 'Annulée')
        .lte('date_fin', maintenant)

      if (erreurTerminee) throw erreurTerminee
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['sessions'],
      })
    },
  })

  useEffect(() => {
    actualiserStatutsSessions.mutate()
    const intervalle = window.setInterval(() => {
      actualiserStatutsSessions.mutate()
    }, 60_000)
    return () => {
      window.clearInterval(intervalle)
    }
  }, [actualiserStatutsSessions.mutate])

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Gestion des sessions"
        description="Planifiez les sessions d’une formation, affectez un formateur et suivez les inscrits."
        action={
          <Button
            onClick={() => {
              setEdite(null)
              setForm(vide)
              setOuvert(true)
            }}
          >
            <Plus /> Nouvelle session
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStat libelle="Total" valeur={sessions.length} />
        <CarteStat
          className="!bg-[#E8F0FE] border !border-[#1A73E8]/20"
          libelleClassName="!text-[#1A73E8]"
          valeurClassName="!text-[#1A73E8]"
          libelle="Planifiées"
          valeur={sessions.filter((s) => s.statut === 'Planifiée').length}
        />
        <CarteStat
          className="!bg-cream border border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="En cours"
          valeur={sessions.filter((s) => s.statut === 'En cours').length}
        />
        <CarteStat
          className="!bg-secondary"
          libelleClassName="!text-muted-foreground"
          valeurClassName="!text-muted-foreground"
          libelle="Terminées"
          valeur={sessions.filter((s) => s.statut === 'Terminée').length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une session"
            className={`${champClass} pl-9`}
          />
        </div>
        <select
          className={selectClass}
          value={statutFiltre}
          onChange={(e) => setStatutFiltre(e.target.value)}
        >
          {['Tous', 'Planifiée', 'En cours', 'Terminée', 'Annulée'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {[
                  'Session',
                  'Formation',
                  'Formateur',
                  'Dates',
                  'Durée(s) ',
                  'Lieu',
                  'Inscrits',
                  'Statut',
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
              ) : affichees.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune session.
                  </td>
                </tr>
              ) : (
                affichees.map((s) => (
                  <tr
                    key={s.session_id}
                    onClick={() => setDetail(s)}
                    className="cursor-pointer border-t border-border hover:bg-secondary/50"
                  >
                    <td className="px-3 py-3 font-semibold text-foreground">
                      {s.nom_session}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {s.formation?.titre ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {s.formateur?.utilisateur
                        ? `${s.formateur.utilisateur.prenoms} ${s.formateur.utilisateur.nom}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {dateHeureFr(s.date_debut)} - {dateHeureFr(s.date_fin)}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {formaternombrejours(s.date_debut, s.date_fin)} jours
                    </td>
                    <td className="px-3 py-3 text-xs">{s.lieu ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">
                      {s.inscriptions?.length ?? 0}
                      {s.capacite ? ` / ${s.capacite}` : ''}
                    </td>
                    <td className="px-3 py-3">
                      <Etiquette valeur={s.statut} />
                    </td>
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Actions"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => ouvrirEdition(s)}
                          >
                            <Pencil /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => supprimer.mutate(s.session_id)}
                            className="background-delete cursor-pointer"
                          >
                            <Trash2 /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <PanneauDetail
          titre={detail.nom_session}
          sousTitre={detail.formation?.titre ?? undefined}
          onFermer={() => setDetail(null)}
        >
          <SectionPanneau titre="Informations">
            <LigneInfo libelle="Formation" valeur={detail.formation?.titre} />
            <LigneInfo
              libelle="Formateur"
              valeur={
                detail.formateur?.utilisateur
                  ? `${detail.formateur.utilisateur.prenoms} ${detail.formateur.utilisateur.nom}`
                  : '—'
              }
            />
            <LigneInfo
              libelle="Début"
              valeur={dateHeureFr(detail.date_debut)}
            />
            <LigneInfo libelle="Fin" valeur={dateHeureFr(detail.date_fin)} />
            <LigneInfo libelle="Lieu" valeur={detail.lieu} />
            <LigneInfo libelle="Capacité" valeur={detail.capacite ?? '—'} />
            <LigneInfo
              libelle="Statut"
              valeur={<Etiquette valeur={detail.statut} />}
            />
          </SectionPanneau>
          <SectionPanneau
            titre={`Participants inscrits (${detail.inscriptions?.length ?? 0})`}
          >
            {(detail.inscriptions ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun participant inscrit.
              </p>
            ) : (
              (detail.inscriptions ?? []).map((i) => (
                <div
                  key={i.inscription_id}
                  className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {i.participant?.utilisateur
                        ? `${i.participant.utilisateur.prenoms} ${i.participant.utilisateur.nom}`
                        : '—'}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {i.participant?.utilisateur?.email}
                    </p>
                  </div>
                  <Etiquette valeur={i.statut} />
                </div>
              ))
            )}
          </SectionPanneau>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => ouvrirEdition(detail)}
          >
            <Pencil /> Modifier la session
          </Button>
        </PanneauDetail>
      ) : null}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {edite ? 'Modifier la session' : 'Nouvelle session'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Nom de la session <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.nom_session}
                onChange={(e) =>
                  setForm({ ...form, nom_session: e.target.value })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* <div className="relative">
                <label className={labelClass}>
                  Formation
                  <LabelObligatoire />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSelectFormationOuvert((ouvert) => !ouvert)
                    setRechercheFormation('')
                  }}
                  className={`${selectClass} flex w-full items-center justify-between gap-2 text-left`}
                >
                  <span className="truncate">
                    {formations.find(
                      (f) =>
                        String(f.formation_id) === String(form.formation_id),
                    )?.titre ?? 'Choisir…'}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      selectFormationOuvert ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {selectFormationOuvert && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    <div className="border-b border-border p-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={rechercheFormation}
                          onChange={(e) =>
                            setRechercheFormation(e.target.value)
                          }
                          placeholder="Rechercher une formation..."
                          autoFocus
                          className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, formation_id: '' })
                          setSelectFormationOuvert(false)
                          setRechercheFormation('')
                        }}
                        className="flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
                      >
                        Choisir…
                      </button>

                      {formationsFiltrees.length > 0 ? (
                        formationsFiltrees.map((f) => {
                          const selectionnee =
                            String(form.formation_id) === String(f.formation_id)

                          return (
                            <button
                              key={f.formation_id}
                              type="button"
                              onClick={() => {
                                setForm({
                                  ...form,
                                  formation_id: String(f.formation_id),
                                })
                                setSelectFormationOuvert(false)
                                setRechercheFormation('')
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                                selectionnee
                                  ? 'bg-orange-50 text-primary'
                                  : 'text-foreground'
                              }`}
                            >
                              <span className="min-w-0 truncate">
                                {f.titre}
                              </span>
                              {selectionnee && (
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                              )}
                            </button>
                          )
                        })
                      ) : (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Aucune formation trouvée.
                        </p>
                      )}
                    </div>

                    <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      {formationsFiltrees.length} formation(s) trouvée(s)
                    </div>
                  </div>
                )}
              </div> */}

              <SelectRecherche
                label="Formation"
                required
                placeholder="Choisir une formation..."
                placeholderRecherche="Rechercher une formation..."
                options={formations.map((f) => ({
                  value: String(f.formation_id),
                  label: f.titre,
                }))}
                value={String(form.formation_id ?? '')}
                onChange={(value) => setForm({ ...form, formation_id: value })}
              />

              <div>
                <label className={labelClass}>Formateur</label>
                <select
                  className={`${selectClass} w-full`}
                  value={form.formateur_id}
                  onChange={(e) =>
                    setForm({ ...form, formateur_id: e.target.value })
                  }
                >
                  <option value="">Non affecté</option>
                  {formateurs.map((f) => (
                    <option key={f.formateur_id} value={f.formateur_id}>
                      {f.utilisateur
                        ? `${f.utilisateur.prenoms} ${f.utilisateur.nom}`
                        : `#${f.formateur_id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Début
                  <LabelObligatoire />
                </label>
                <input
                  type="datetime-local"
                  className={champClass}
                  value={form.date_debut}
                  onChange={(e) =>
                    setForm({ ...form, date_debut: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Fin
                  <LabelObligatoire />
                </label>
                <input
                  type="datetime-local"
                  className={champClass}
                  value={form.date_fin}
                  onChange={(e) =>
                    setForm({ ...form, date_fin: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Lieu
                  <LabelObligatoire />
                </label>
                <input
                  className={champClass}
                  value={form.lieu}
                  onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Capacité</label>
                <input
                  type="number"
                  min={1}
                  className={champClass}
                  value={form.capacite}
                  onChange={(e) =>
                    setForm({ ...form, capacite: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Statut</label>
              <select
                className={`${selectClass} w-full`}
                value={form.statut}
                onChange={(e) =>
                  setForm({ ...form, statut: e.target.value as StatutS })
                }
              >
                {['Planifiée', 'En cours', 'Terminée', 'Annulée'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => enregistrer.mutate()}
              disabled={enregistrer.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
