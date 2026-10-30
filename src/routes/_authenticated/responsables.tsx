import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
  MenuActions,
  champClass,
  labelClass,
  selectClass,
  LabelObligatoire,
} from '@/components/app/AdminKit'
import { Switch } from '@/components/ui/switch'
import { AccesReserve } from '@/components/app/Acces'
export const Route = createFileRoute('/_authenticated/responsables')({
  head: () => ({
    meta: [
      { title: 'Responsables ' },
      {
        name: 'description',
        content:
          'Gérez les responsables, leur service et leur statut de service.',
      },
      { property: 'og:title', content: 'Responsables ' },
      {
        property: 'og:description',
        content:
          'Gérez les responsables, leur service et leur statut de service.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR', 'RESPONSABLE']}>
      <Page />
    </AccesReserve>
  ),
})

type Responsable = {
  responsable_id: number
  utilisateur_id: number
  service: string | null
  intitule_poste: string | null
  statut_service: 'Actif' | 'Inactif'
  utilisateur: {
    nom: string
    prenoms: string
    email: string
    telephone: string | null
  } | null
}

const vide = {
  utilisateur_id: '',
  service: '',
  intitule_poste: '',
  statut_service: 'Actif' as 'Actif' | 'Inactif',
}

function Page() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [edite, setEdite] = useState<Responsable | null>(null)
  const [form, setForm] = useState(vide)

  const { data: responsables = [], isLoading } = useQuery({
    queryKey: ['admin-responsables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsable')
        .select(
          'responsable_id, utilisateur_id, service, intitule_poste, statut_service, utilisateur:utilisateur(nom, prenoms, email, telephone)',
        )
      if (error) throw error
      return (data ?? []) as unknown as Responsable[]
    },
  })

  const { data: comptes = [] } = useQuery({
    queryKey: ['comptes-disponibles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utilisateur')
        .select('utilisateur_id, nom, prenoms, email')
        .order('nom')
      if (error) throw error
      return (data ?? []) as {
        utilisateur_id: number
        nom: string
        prenoms: string
        email: string
      }[]
    },
  })

  const enregistrer = useMutation({
    mutationFn: async () => {
      const valeurs = {
        service: form.service || null,
        intitule_poste: form.intitule_poste || null,
        statut_service: form.statut_service,
      }
      if (edite) {
        const { error } = await supabase
          .from('responsable')
          .update(valeurs)
          .eq('responsable_id', edite.responsable_id)
        if (error) throw error
        return
      }
      if (!form.utilisateur_id)
        throw new Error('Choisissez le compte utilisateur du responsable.')
      if (!form.service) throw new Error('Saisissez le service.')
      if (!form.intitule_poste) throw new Error('Saisissez votre poste.')
      const utilisateur_id = Number(form.utilisateur_id)
      const { error } = await supabase
        .from('responsable')
        .insert({ ...valeurs, utilisateur_id })
      if (error) throw error
      const { data: role } = await supabase
        .from('role')
        .select('role_id')
        .eq('code_role', 'RESPONSABLE')
        .maybeSingle()
      if (role)
        await supabase
          .from('role_utilisateur')
          .insert({ utilisateur_id, role_id: role.role_id })
    },
    onSuccess: () => {
      toast.success(edite ? 'Responsable modifié.' : 'Responsable enregistré.')
      setOuvert(false)
      setEdite(null)
      setForm(vide)
      queryClient.invalidateQueries({ queryKey: ['admin-responsables'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const changerStatut = useMutation({
    mutationFn: async ({
      id,
      statut,
    }: {
      id: number
      statut: 'Actif' | 'Inactif'
    }) => {
      const { error } = await supabase
        .from('responsable')
        .update({ statut_service: statut })
        .eq('responsable_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Statut de service mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin-responsables'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('responsable')
        .delete()
        .eq('responsable_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Responsable supprimé.')
      queryClient.invalidateQueries({ queryKey: ['admin-responsables'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const affiches = useMemo(
    () =>
      responsables.filter((r) => {
        const champ =
          `${r.utilisateur?.prenoms ?? ''} ${r.utilisateur?.nom ?? ''} ${r.utilisateur?.email ?? ''} ${r.service ?? ''}`.toLowerCase()
        return !recherche || champ.includes(recherche.toLowerCase())
      }),
    [responsables, recherche],
  )

  const libres = comptes.filter(
    (c) => !responsables.some((r) => r.utilisateur_id === c.utilisateur_id),
  )

  function ouvrirEdition(r: Responsable) {
    setEdite(r)
    setForm({
      utilisateur_id: String(r.utilisateur_id),
      service: r.service ?? '',
      intitule_poste: r.intitule_poste ?? '',
      statut_service: r.statut_service,
    })
    setOuvert(true)
  }

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Gestion des responsables"
        description="Service, intitulé de poste et statut de service des responsables."
        action={
          <Button
            onClick={() => {
              setEdite(null)
              setForm(vide)
              setOuvert(true)
            }}
          >
            <Plus /> Nouveau responsable
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Responsables"
          valeur={responsables.length}
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Actifs"
          valeur={
            responsables.filter((r) => r.statut_service === 'Actif').length
          }
        />
        <CarteStat
          className="!bg-cream border !border-primary/20"
          libelleClassName="!text-primary"
          valeurClassName="!text-primary"
          libelle="Inactifs"
          valeur={
            responsables.filter((r) => r.statut_service === 'Inactif').length
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un responsable"
            className={`${champClass} pl-9`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {[
                  'Responsable',
                  'Contact',
                  'Service',
                  'Poste',
                  'Statut de service',
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
                <SqueletteLignesTableau colonnes={6} />
              ) : affiches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucun responsable.
                  </td>
                </tr>
              ) : (
                affiches.map((r) => (
                  <tr
                    key={r.responsable_id}
                    className="border-t border-border hover:bg-secondary/50"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">
                        {r.utilisateur
                          ? `${r.utilisateur.prenoms} ${r.utilisateur.nom}`
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.utilisateur?.email}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {r.utilisateur?.telephone ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">{r.service ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">
                      {r.intitule_poste ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={r.statut_service === 'Actif'}
                          disabled={changerStatut.isPending}
                          onCheckedChange={(v) =>
                            changerStatut.mutate({
                              id: r.responsable_id,
                              statut: v ? 'Actif' : 'Inactif',
                            })
                          }
                        />
                        <span
                          className={`text-xs font-medium ${r.statut_service === 'Actif' ? 'text-[#137333]' : 'text-muted-foreground'}`}
                        >
                          {r.statut_service}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <MenuActions>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => ouvrirEdition(r)}
                        >
                          <Pencil /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => supprimer.mutate(r.responsable_id)}
                          className="background-delete cursor-pointer"
                        >
                          <Trash2 /> Supprimer
                        </DropdownMenuItem>
                      </MenuActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={ouvert}
        onOpenChange={(o) => {
          setOuvert(o)
          if (!o) setEdite(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {edite ? 'Modifier le responsable' : 'Nouveau responsable'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {edite ? null : (
              <div>
                <label className={labelClass}>
                  Compte utilisateur <LabelObligatoire />
                </label>
                <select
                  className={`${selectClass} w-full`}
                  value={form.utilisateur_id}
                  onChange={(e) =>
                    setForm({ ...form, utilisateur_id: e.target.value })
                  }
                >
                  <option value="">Choisir…</option>
                  {libres.map((c) => (
                    <option key={c.utilisateur_id} value={c.utilisateur_id}>
                      {c.prenoms} {c.nom} — {c.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>
                Service <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>
                Intitulé du poste <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.intitule_poste}
                onChange={(e) =>
                  setForm({ ...form, intitule_poste: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Statut de service <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.statut_service}
                onChange={(e) =>
                  setForm({
                    ...form,
                    statut_service: e.target.value as 'Actif' | 'Inactif',
                  })
                }
              >
                {['Actif', 'Inactif'].map((s) => (
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
