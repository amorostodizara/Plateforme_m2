import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Ban,
  FileDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react'
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
import { telechargerDeclarationPdf } from '@/lib/paiement-pdf'
import { AccesReserve } from '@/components/app/Acces'
import { useDroits } from '@/components/app/AppShell'
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
  dateHeureFr,
  labelClass,
  selectClass,
  LabelObligatoire,
} from '@/components/app/AdminKit'

export const Route = createFileRoute('/_authenticated/paiements-formateurs')({
  head: () => ({
    meta: [
      { title: 'Paiements formateurs ' },
      {
        name: 'description',
        content:
          'Enregistrez et suivez les paiements des formateurs par session de formation.',
      },
      {
        property: 'og:title',
        content: 'Paiements formateurs ',
      },
      {
        property: 'og:description',
        content:
          'Enregistrez et suivez les paiements des formateurs par session de formation.',
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

type Paiement = {
  paiement_id: number
  formateur_id: number
  montant: number
  methode: string
  ref: string | null
  date_paiement: string
  statut: string
  remarque: string | null
  cree_le: string
  valide_par: number | null
  validateur: {
    responsable_id: number
    service: string | null
    intitule_poste: string | null
    utilisateur: { nom: string; prenoms: string } | null
  } | null
  formateur: {
    formateur_id: number
    specialisation: string | null
    institution: string | null
    utilisateur: {
      nom: string
      prenoms: string
      email: string
      telephone: string | null
    } | null
  } | null
  session: {
    session_id: number
    nom_session: string
    date_debut: string
    date_fin: string
    formation: { titre: string } | null
  } | null
}

type SessionItem = {
  session_id: number
  nom_session: string
  formateur_id: number | null
  formation: { titre: string } | null
}

const METHODES = ['Espèces', 'Mobile Money', 'Virement', 'Chèque'] as const
const STATUTS = ['En attente', 'Payé', 'Annulé'] as const

const vide = {
  formateur_id: '',
  session_id: '',
  montant: '',
  methode: 'Espèces',
  ref: '',
  date_paiement: new Date().toISOString().slice(0, 10),
  statut: 'Payé',
  remarque: '',
  valide_par: '',
}

const ariary = (v: number) => `${Number(v).toLocaleString('fr-FR')} Ar`

function Page() {
  const queryClient = useQueryClient()
  const { estGestionnaire } = useDroits()
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('Tous')
  const [filtreMethode, setFiltreMethode] = useState('Toutes')
  const [filtreFormateur, setFiltreFormateur] = useState('Tous')
  const [detail, setDetail] = useState<Paiement | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const [edite, setEdite] = useState<number | null>(null)
  const [form, setForm] = useState(vide)

  const { data: paiements = [], isLoading } = useQuery({
    queryKey: ['paiements-formateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paiement_formateur')
        .select(
          'paiement_id, formateur_id, montant, methode, date_paiement, statut, remarque, cree_le, valide_par, validateur:responsable!paiement_formateur_valide_par_fkey(responsable_id, service, intitule_poste, utilisateur:utilisateur(nom, prenoms)), formateur:formateur(formateur_id, specialisation, institution, utilisateur:utilisateur(nom, prenoms, email, telephone)), session:session_formation(session_id, nom_session, date_debut, date_fin, formation:formation(titre))',
        )
        .order('date_paiement', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Paiement[]
    },
  })

  const { data: formateurs = [] } = useQuery({
    queryKey: ['liste-formateurs-paiement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formateur')
        .select('formateur_id, utilisateur:utilisateur(nom, prenoms, email)')
      if (error) throw error
      return (data ?? []) as unknown as {
        formateur_id: number
        utilisateur: { nom: string; prenoms: string; email: string } | null
      }[]
    },
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['liste-sessions-paiement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_formation')
        .select(
          'session_id, nom_session, formateur_id, formation:formation(titre)',
        )
        .order('date_debut', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as SessionItem[]
    },
  })

  const { data: responsables = [] } = useQuery({
    queryKey: ['liste-responsables-paiement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsable')
        .select(
          'responsable_id, intitule_poste, utilisateur:utilisateur(nom, prenoms)',
        )
      if (error) throw error
      return (data ?? []) as unknown as {
        responsable_id: number
        intitule_poste: string | null
        utilisateur: { nom: string; prenoms: string } | null
      }[]
    },
  })

  function pdf(p: Paiement) {
    const u = p.formateur?.utilisateur
    telechargerDeclarationPdf({
      nom: u?.nom ?? '',
      prenoms: u?.prenoms ?? '',
      service: p.formateur?.institution ?? p.formateur?.specialisation ?? '',
      montant: p.montant,
      dateDebut: p.session?.date_debut ?? null,
      dateFin: p.session?.date_fin ?? null,
      motif:
        `Formation ${p.session?.formation?.titre ?? ''}${p.session ? ` — ${p.session.nom_session}` : ''}`.trim(),
      validateur: p.validateur?.utilisateur
        ? {
            nom: p.validateur.utilisateur.nom,
            prenoms: p.validateur.utilisateur.prenoms,
            fonction:
              p.validateur.intitule_poste ??
              p.validateur.service ??
              'Responsable',
          }
        : null,
      datePaiement: p.date_paiement,
    })
  }

  const enregistrer = useMutation({
    mutationFn: async () => {
      if (!form.formateur_id)
        throw new Error('Choisissez le formateur concerné.')
      if (!form.session_id) throw new Error('Choisissez la session concerné.')
      if (!form.montant || Number(form.montant) <= 0)
        throw new Error('Saisissez un montant valide.')
      if (!form.methode) throw new Error('Choisissez la methode paiement.')
      if (!form.date_paiement)
        throw new Error('Selectionez la date de paiement.')
      if (!form.statut) throw new Error('Remplissez le statut.')
      if (!form.valide_par)
        throw new Error('Choisissez le responsable qui la valde.')
      const valeurs = {
        formateur_id: Number(form.formateur_id),
        session_id: form.session_id ? Number(form.session_id) : null,
        montant: Number(form.montant),
        methode: form.methode as (typeof METHODES)[number],
        ref: form.ref || null,
        date_paiement: form.date_paiement,
        statut: form.statut as (typeof STATUTS)[number],
        remarque: form.remarque || null,
        valide_par: form.valide_par ? Number(form.valide_par) : null,
      }
      const { error } = edite
        ? await supabase
            .from('paiement_formateur')
            .update(valeurs)
            .eq('paiement_id', edite)
        : await supabase.from('paiement_formateur').insert(valeurs)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(edite ? 'Paiement modifié.' : 'Paiement enregistré.')
      setOuvert(false)
      setEdite(null)
      setForm(vide)
      queryClient.invalidateQueries({ queryKey: ['paiements-formateurs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const changerStatut = useMutation({
    mutationFn: async ({
      id,
      statut,
    }: {
      id: number
      statut: (typeof STATUTS)[number]
    }) => {
      const { error } = await supabase
        .from('paiement_formateur')
        .update({ statut })
        .eq('paiement_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Statut du paiement mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['paiements-formateurs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('paiement_formateur')
        .delete()
        .eq('paiement_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Paiement supprimé.')
      setDetail(null)
      queryClient.invalidateQueries({ queryKey: ['paiements-formateurs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const affiches = useMemo(
    () =>
      paiements.filter((p) => {
        const u = p.formateur?.utilisateur
        const champ =
          `${u?.prenoms ?? ''} ${u?.nom ?? ''} ${u?.email ?? ''} ${p.session?.formation?.titre ?? ''} ${p.remarque ?? ''}`.toLowerCase()
        if (recherche && !champ.includes(recherche.toLowerCase())) return false
        if (filtreStatut !== 'Tous' && p.statut !== filtreStatut) return false
        if (filtreMethode !== 'Toutes' && p.methode !== filtreMethode)
          return false
        if (
          filtreFormateur !== 'Tous' &&
          String(p.formateur_id) !== filtreFormateur
        )
          return false
        return true
      }),
    [paiements, recherche, filtreStatut, filtreMethode, filtreFormateur],
  )

  const somme = (statut: string) =>
    paiements
      .filter((p) => p.statut === statut)
      .reduce((t, p) => t + Number(p.montant), 0)

  const compte = (statut: Paiement['statut']) =>
    paiements.filter((p) => p.statut === statut).length

  function ouvrirNouveau() {
    setEdite(null)
    setForm(vide)
    setOuvert(true)
  }

  function ouvrirEdition(p: Paiement) {
    setEdite(p.paiement_id)
    setForm({
      formateur_id: String(p.formateur_id),
      session_id: p.session ? String(p.session.session_id) : '',
      montant: String(p.montant),
      methode: p.methode,
      ref: p.ref ?? '',
      date_paiement: p.date_paiement.slice(0, 10),
      statut: p.statut,
      remarque: p.remarque ?? '',
      valide_par: p.valide_par ? String(p.valide_par) : '',
    })
    setOuvert(true)
  }

  const sessionsDuFormateur = sessions.filter(
    (s) => !form.formateur_id || s.formateur_id === Number(form.formateur_id),
  )

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Paiements des formateurs"
        description="Enregistrez, suivez et validez les paiements liés aux sessions animées."
        {...(estGestionnaire
          ? {
              action: (
                <Button onClick={ouvrirNouveau}>
                  <Plus /> Nouveau paiement
                </Button>
              ),
            }
          : {})}
      />

      {estGestionnaire ? (
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          <Link
            to="/formateurs"
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Formateurs
          </Link>
          <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
            Paiements formateurs
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Paiements"
          valeur={paiements.length}
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Total payé"
          valeur={ariary(somme('Payé'))}
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="En attente"
          valeur={compte('En attente')}
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Annulé"
          valeur={compte('Annulé')}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un formateur, une formation…"
            className={`${champClass} pl-9`}
          />
        </div>
        {estGestionnaire ? (
          <div>
            <label className={labelClass}>Formateur</label>
            <select
              className={selectClass}
              value={filtreFormateur}
              onChange={(e) => setFiltreFormateur(e.target.value)}
            >
              <option value="Tous">Tous</option>
              {formateurs.map((f) => (
                <option key={f.formateur_id} value={f.formateur_id}>
                  {f.utilisateur?.prenoms} {f.utilisateur?.nom}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className={labelClass}>Statut</label>
          <select
            className={selectClass}
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
          >
            <option>Tous</option>
            {STATUTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Méthode</label>
          <select
            className={selectClass}
            value={filtreMethode}
            onChange={(e) => setFiltreMethode(e.target.value)}
          >
            <option>Toutes</option>
            {METHODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[540px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {[
                  'Formateur',
                  'Formation / Session',
                  'Montant',
                  'Méthode',
                  'Date de paiement',
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
                <SqueletteLignesTableau colonnes={7} />
              ) : affiches.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucun paiement enregistré.
                  </td>
                </tr>
              ) : (
                affiches.map((p) => (
                  <tr
                    key={p.paiement_id}
                    onClick={() => setDetail(p)}
                    className="cursor-pointer border-t border-border hover:bg-secondary/50"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">
                        {p.formateur?.utilisateur
                          ? `${p.formateur.utilisateur.prenoms} ${p.formateur.utilisateur.nom}`
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.formateur?.utilisateur?.email}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <p className="font-medium text-foreground">
                        {p.session?.formation?.titre ?? 'Sans session'}
                      </p>
                      <p className="text-muted-foreground">
                        {p.session?.nom_session ?? '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-primary">
                      {ariary(p.montant)}
                    </td>
                    <td className="px-3 py-3 text-xs">{p.methode}</td>
                    <td className="px-3 py-3 text-xs">
                      {dateFr(p.date_paiement)}
                    </td>
                    <td className="px-3 py-3">
                      <Etiquette valeur={p.statut} />
                    </td>
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {estGestionnaire ? (
                        <MenuActions>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => pdf(p)}
                          >
                            <FileDown /> Télécharger le PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => ouvrirEdition(p)}
                          >
                            <Pencil /> Modifier le paiement
                          </DropdownMenuItem>
                          {p.statut !== 'Payé' ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() =>
                                changerStatut.mutate({
                                  id: p.paiement_id,
                                  statut: 'Payé',
                                })
                              }
                            >
                              <BadgeCheck /> Marquer comme payé
                            </DropdownMenuItem>
                          ) : null}
                          {p.statut !== 'Annulé' ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() =>
                                changerStatut.mutate({
                                  id: p.paiement_id,
                                  statut: 'Annulé',
                                })
                              }
                            >
                              <Ban /> Annuler le paiement
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => supprimer.mutate(p.paiement_id)}
                            className="background-delete cursor-pointer"
                          >
                            <Trash2 /> Supprimer
                          </DropdownMenuItem>
                        </MenuActions>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pdf(p)}
                        >
                          <FileDown /> PDF
                        </Button>
                      )}
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
          titre={
            detail.formateur?.utilisateur
              ? `${detail.formateur.utilisateur.prenoms} ${detail.formateur.utilisateur.nom}`
              : 'Paiement'
          }
          sousTitre={ariary(detail.montant)}
          onFermer={() => setDetail(null)}
        >
          <SectionPanneau titre="Paiement">
            <LigneInfo libelle="Montant" valeur={ariary(detail.montant)} />
            <LigneInfo libelle="Méthode" valeur={detail.methode} />
            <LigneInfo libelle="Réference" valeur={detail.ref ?? '_'} />
            <LigneInfo
              libelle="Date de paiement"
              valeur={dateFr(detail.date_paiement)}
            />
            <LigneInfo
              libelle="Statut"
              valeur={<Etiquette valeur={detail.statut} />}
            />
            <LigneInfo
              libelle="Validé par"
              valeur={
                detail.validateur?.utilisateur
                  ? `${detail.validateur.utilisateur.prenoms} ${detail.validateur.utilisateur.nom}`
                  : '—'
              }
            />
            <LigneInfo
              libelle="Enregistré le"
              valeur={dateHeureFr(detail.cree_le)}
            />
          </SectionPanneau>
          <SectionPanneau titre="Formation & session">
            <LigneInfo
              libelle="Formation"
              valeur={detail.session?.formation?.titre}
            />
            <LigneInfo libelle="Session" valeur={detail.session?.nom_session} />
          </SectionPanneau>
          <SectionPanneau titre="Formateur">
            <LigneInfo
              libelle="Email"
              valeur={detail.formateur?.utilisateur?.email}
            />
            <LigneInfo
              libelle="Téléphone"
              valeur={detail.formateur?.utilisateur?.telephone}
            />
            <LigneInfo
              libelle="Spécialisation"
              valeur={detail.formateur?.specialisation}
            />
          </SectionPanneau>
          {detail.remarque ? (
            <SectionPanneau titre="Remarque">
              <p className="text-xs text-muted-foreground">{detail.remarque}</p>
            </SectionPanneau>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => pdf(detail)}
            >
              <FileDown /> Télécharger la déclaration (PDF)
            </Button>

            {estGestionnaire ? (
              <Button className="w-full" onClick={() => ouvrirEdition(detail)}>
                <Pencil /> Modifier ce paiement
              </Button>
            ) : null}
          </div>
        </PanneauDetail>
      ) : null}

      <Dialog
        open={ouvert}
        onOpenChange={(o) => {
          setOuvert(o)
          if (!o) setEdite(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Wallet className="mr-2 inline h-4 w-4" />
              {edite ? 'Modifier le paiement' : 'Nouveau paiement'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Formateur <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.formateur_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    formateur_id: e.target.value,
                    session_id: '',
                  })
                }
              >
                <option value="">Choisir…</option>
                {formateurs.map((f) => (
                  <option key={f.formateur_id} value={f.formateur_id}>
                    {f.utilisateur?.prenoms} {f.utilisateur?.nom} —{' '}
                    {f.utilisateur?.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Session animée <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.session_id}
                onChange={(e) =>
                  setForm({ ...form, session_id: e.target.value })
                }
              >
                <option value="">Sans session</option>
                {sessionsDuFormateur.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.formation?.titre} — {s.nom_session}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Montant (Ar) <LabelObligatoire />
              </label>
              <input
                type="number"
                min={0}
                className={champClass}
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                placeholder="Ex: 200000  "
              />
            </div>
            <div>
              <label className={labelClass}>
                Méthode
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.methode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    methode: e.target.value,
                    ref: e.target.value === 'Espèces' ? '' : form.ref,
                  })
                }
              >
                {METHODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Date du paiement
                <LabelObligatoire />
              </label>
              <input
                type="date"
                className={champClass}
                value={form.date_paiement}
                onChange={(e) =>
                  setForm({ ...form, date_paiement: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Statut
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value })}
              >
                {STATUTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            {form.methode !== 'Espèces' && (
              <div className="sm:col-span-2">
                <label className={labelClass}>Référence</label>
                <input
                  type="text"
                  maxLength={100}
                  className={champClass}
                  placeholder={
                    form.methode === 'Mobile Money'
                      ? 'Ex. OM123456789'
                      : form.methode === 'Virement'
                        ? 'Ex. VIR-2026-00125'
                        : 'Ex. CHQ-001234'
                  }
                  value={form.ref}
                  onChange={(e) => setForm({ ...form, ref: e.target.value })}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Validé par (responsable)
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.valide_par}
                onChange={(e) =>
                  setForm({ ...form, valide_par: e.target.value })
                }
              >
                <option value="">Non validé</option>
                {responsables.map((r) => (
                  <option key={r.responsable_id} value={r.responsable_id}>
                    {r.utilisateur?.prenoms} {r.utilisateur?.nom}
                    {r.intitule_poste ? ` — ${r.intitule_poste}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Remarque</label>
              <input
                className={champClass}
                value={form.remarque}
                onChange={(e) => setForm({ ...form, remarque: e.target.value })}
              />
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
