import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Pencil, Search, ShieldCheck } from 'lucide-react'
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
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { SqueletteLignesTableau } from '@/components/app/Squelette'
import { AccesReserve } from '@/components/app/Acces'
import { Switch } from '@/components/ui/switch'
import {
  CarteStat,
  EnteteAdmin,
  MenuActions,
  champClass,
  labelClass,
  selectClass,
} from '@/components/app/AdminKit'

export const Route = createFileRoute('/_authenticated/utilisateurs')({
  head: () => ({
    meta: [
      { title: 'Utilisateurs — Orange Digital Center' },
      {
        name: 'description',
        content:
          'Gérez les comptes de la plateforme, leur statut et leurs rôles.',
      },
      { property: 'og:title', content: 'Utilisateurs — Orange Digital Center' },
      {
        property: 'og:description',
        content:
          'Gérez les comptes de la plateforme, leur statut et leurs rôles.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR']}>
      <Page />
    </AccesReserve>
  ),
})

type CodeRole = 'PARTICIPANT' | 'FORMATEUR' | 'RESPONSABLE' | 'ADMINISTRATEUR'

type Utilisateur = {
  utilisateur_id: number
  nom: string
  prenoms: string
  email: string
  telephone: string | null
  adresse: string | null
  statut: 'Actif' | 'Inactif'
  email_verifie: boolean
  roles:
    | {
        role_utilisateur_id: number
        role: { role_id: number; code_role: CodeRole } | null
      }[]
    | null
}

function Page() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [filtreRole, setFiltreRole] = useState('Tous')
  const [edite, setEdite] = useState<Utilisateur | null>(null)
  const [form, setForm] = useState({
    nom: '',
    prenoms: '',
    telephone: '',
    adresse: '',
    statut: 'Actif' as 'Actif' | 'Inactif',
  })
  const [roles, setRoles] = useState<Utilisateur | null>(null)

  const { data: utilisateurs = [], isLoading } = useQuery({
    queryKey: ['admin-utilisateurs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utilisateur')
        .select(
          'utilisateur_id, nom, prenoms, email, telephone, adresse, statut, email_verifie, roles:role_utilisateur(role_utilisateur_id, role:role(role_id, code_role))',
        )
        .order('nom')
      if (error) throw error
      return (data ?? []) as unknown as Utilisateur[]
    },
  })

  const { data: listeRoles = [] } = useQuery({
    queryKey: ['liste-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role')
        .select('role_id, code_role, nom_role')
        .order('role_id')
      if (error) throw error
      return (data ?? []) as {
        role_id: number
        code_role: CodeRole
        nom_role: string
      }[]
    },
  })

  const enregistrer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('utilisateur')
        .update({
          nom: form.nom,
          prenoms: form.prenoms,
          telephone: form.telephone || null,
          adresse: form.adresse || null,
          statut: form.statut,
        })
        .eq('utilisateur_id', edite!.utilisateur_id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Compte mis à jour.')
      setEdite(null)
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] })
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
        .from('utilisateur')
        .update({ statut })
        .eq('utilisateur_id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      toast.success(`Compte ${v.statut === 'Actif' ? 'activé' : 'désactivé'}.`)
      queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const basculerRole = useMutation({
    mutationFn: async ({
      utilisateur,
      role_id,
      actif,
    }: {
      utilisateur: Utilisateur
      role_id: number
      actif: boolean
    }) => {
      if (actif) {
        const { error } = await supabase
          .from('role_utilisateur')
          .insert({ utilisateur_id: utilisateur.utilisateur_id, role_id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('role_utilisateur')
          .delete()
          .eq('utilisateur_id', utilisateur.utilisateur_id)
          .eq('role_id', role_id)
        if (error) throw error
      }
    },
    onSuccess: async () => {
      toast.success('Rôles mis à jour.')
      await queryClient.invalidateQueries({ queryKey: ['admin-utilisateurs'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const affiches = useMemo(
    () =>
      utilisateurs.filter((u) => {
        const codes = (u.roles ?? []).map((r) => r.role?.code_role)
        if (filtreRole !== 'Tous' && !codes.includes(filtreRole as CodeRole))
          return false
        const champ =
          `${u.prenoms} ${u.nom} ${u.email} ${u.telephone ?? ''}`.toLowerCase()
        return !recherche || champ.includes(recherche.toLowerCase())
      }),
    [utilisateurs, recherche, filtreRole],
  )

  const courant = roles
    ? (utilisateurs.find((u) => u.utilisateur_id === roles.utilisateur_id) ??
      roles)
    : null

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Gestion des utilisateurs"
        description="Comptes de la plateforme : informations, statut, vérification de l’email et rôles."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStat libelle="Comptes" valeur={utilisateurs.length} />
        <CarteStat
          libelle="Actifs"
          valeur={utilisateurs.filter((u) => u.statut === 'Actif').length}
        />
        <CarteStat
          libelle="Emails vérifiés"
          valeur={utilisateurs.filter((u) => u.email_verifie).length}
        />
        <CarteStat
          libelle="Administrateurs"
          valeur={
            utilisateurs.filter((u) =>
              (u.roles ?? []).some(
                (r) => r.role?.code_role === 'ADMINISTRATEUR',
              ),
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
            placeholder="Rechercher un compte"
            className={`${champClass} pl-9`}
          />
        </div>
        <select
          className={selectClass}
          value={filtreRole}
          onChange={(e) => setFiltreRole(e.target.value)}
        >
          {[
            'Tous',
            'PARTICIPANT',
            'FORMATEUR',
            'RESPONSABLE',
            'ADMINISTRATEUR',
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {[
                  'Utilisateur',
                  'Téléphone',
                  'Adresse',
                  'Email vérifié',
                  'Rôles',
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
                    Aucun compte trouvé.
                  </td>
                </tr>
              ) : (
                affiches.map((u) => (
                  <tr
                    key={u.utilisateur_id}
                    className="border-t border-border hover:bg-secondary/50"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">
                        {u.prenoms} {u.nom}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">{u.telephone ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">{u.adresse ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">
                      {u.email_verifie ? (
                        <span className="inline-flex items-center gap-1 text-[#11700f]">
                          <BadgeCheck className="h-4 w-4" /> Oui
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Non</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((r) => (
                          <span
                            key={r.role_utilisateur_id}
                            className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-primary"
                          >
                            {r.role?.code_role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.statut === 'Actif'}
                          disabled={changerStatut.isPending}
                          aria-label={`Activer ou désactiver le compte de ${u.prenoms} ${u.nom}`}
                          onCheckedChange={(v) =>
                            changerStatut.mutate({
                              id: u.utilisateur_id,
                              statut: v ? 'Actif' : 'Inactif',
                            })
                          }
                        />
                        <span
                          className={`text-xs font-medium ${u.statut === 'Actif' ? 'text-[#137333]' : 'text-muted-foreground'}`}
                        >
                          {u.statut}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <MenuActions>
                        <DropdownMenuItem
                          onClick={() => {
                            setEdite(u)
                            setForm({
                              nom: u.nom,
                              prenoms: u.prenoms,
                              telephone: u.telephone ?? '',
                              adresse: u.adresse ?? '',
                              statut: u.statut,
                            })
                          }}
                        >
                          <Pencil /> Modifier le compte
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoles(u)}>
                          <ShieldCheck /> Gérer les rôles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            changerStatut.mutate({
                              id: u.utilisateur_id,
                              statut:
                                u.statut === 'Actif' ? 'Inactif' : 'Actif',
                            })
                          }
                        >
                          <BadgeCheck />{' '}
                          {u.statut === 'Actif' ? 'Désactiver' : 'Activer'}
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

      <Dialog open={!!edite} onOpenChange={(o) => !o && setEdite(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Prénoms</label>
              <input
                className={champClass}
                value={form.prenoms}
                onChange={(e) => setForm({ ...form, prenoms: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Nom</label>
              <input
                className={champClass}
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input
                className={champClass}
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Adresse</label>
              <input
                className={champClass}
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Statut du compte</label>
              <select
                className={`${selectClass} w-full`}
                value={form.statut}
                onChange={(e) =>
                  setForm({
                    ...form,
                    statut: e.target.value as 'Actif' | 'Inactif',
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
            <Button variant="outline" onClick={() => setEdite(null)}>
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

      <Dialog open={!!roles} onOpenChange={(o) => !o && setRoles(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Rôles de {courant?.prenoms} {courant?.nom}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {listeRoles.map((r) => {
              const actif = (courant?.roles ?? []).some(
                (x) => x.role?.role_id === r.role_id,
              )
              return (
                <label
                  key={r.role_id}
                  className="flex items-center gap-3 rounded-md border border-border p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={actif}
                    onChange={(e) =>
                      courant &&
                      basculerRole.mutate({
                        utilisateur: courant,
                        role_id: r.role_id,
                        actif: e.target.checked,
                      })
                    }
                  />
                  <span className="font-medium text-foreground">
                    {r.nom_role}
                  </span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {r.code_role}
                  </span>
                </label>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setRoles(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
