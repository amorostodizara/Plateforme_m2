import { Fragment, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { CarteStat, EnteteAdmin, Etiquette } from '@/components/app/AdminKit'
import { AccesReserve } from '@/components/app/Acces'
import { Bloc } from '@/components/app/Squelette'

export const Route = createFileRoute(
  '/_authenticated/parametres/roles-permissions',
)({
  head: () => ({
    meta: [
      { title: 'Rôles et permissions ' },
      {
        name: 'description',
        content:
          'Configurez les rôles et les autorisations d’accès aux modules.',
      },
      { property: 'og:title', content: 'Rôles et permissions ' },
      {
        property: 'og:description',
        content:
          'Configurez les rôles et les autorisations d’accès aux modules.',
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

type Role = {
  role_id: number
  nom_role: string
  code_role: string
  statut: string
  description: string | null
}
type Permission = {
  permission_id: number
  nom: string
  code: string
  module: string
}
type Lien = {
  role_permission_id: number
  role_id: number
  permission_id: number
}

const ORDRE = ['PARTICIPANT', 'FORMATEUR', 'RESPONSABLE', 'ADMINISTRATEUR']

function Page() {
  const queryClient = useQueryClient()
  const [vue, setVue] = useState<'matrice' | 'role'>('matrice')
  const [roleActif, setRoleActif] = useState<number | null>(null)

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role')
        .select('role_id, nom_role, code_role, statut, description')
        .order('role_id')
      if (error) throw error
      return (data ?? []) as Role[]
    },
  })

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission')
        .select('permission_id, nom, code, module')
        .order('permission_id')
      if (error) throw error
      return (data ?? []) as Permission[]
    },
  })

  const { data: liens = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permission')
        .select('role_permission_id, role_id, permission_id')
      if (error) throw error
      return (data ?? []) as Lien[]
    },
  })

  const basculer = useMutation({
    mutationFn: async ({
      role_id,
      permission_id,
      actif,
    }: {
      role_id: number
      permission_id: number
      actif: boolean
    }) => {
      if (actif) {
        const { error } = await supabase
          .from('role_permission')
          .insert({ role_id, permission_id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('role_permission')
          .delete()
          .eq('role_id', role_id)
          .eq('permission_id', permission_id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Autorisations mises à jour.')
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
      queryClient.invalidateQueries({ queryKey: ['profil-courant'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rolesTries = useMemo(
    () =>
      [...roles].sort(
        (a, b) => ORDRE.indexOf(a.code_role) - ORDRE.indexOf(b.code_role),
      ),
    [roles],
  )

  const modules = useMemo(() => {
    const groupes = new Map<string, Permission[]>()
    permissions.forEach((p) =>
      groupes.set(p.module, [...(groupes.get(p.module) ?? []), p]),
    )
    return Array.from(groupes.entries())
  }, [permissions])

  const aDroit = (role_id: number, permission_id: number) =>
    liens.some(
      (l) => l.role_id === role_id && l.permission_id === permission_id,
    )

  const selection = roleActif ?? rolesTries[0]?.role_id ?? null
  const accordees = new Set(
    liens.filter((l) => l.role_id === selection).map((l) => l.permission_id),
  )

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Rôles et permissions"
        description="Matrice des droits : chaque menu et chaque action accessible par acteur de la plateforme."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CarteStat libelle="Rôles" valeur={roles.length} />
        <CarteStat libelle="Permissions" valeur={permissions.length} />
        <CarteStat libelle="Autorisations accordées" valeur={liens.length} />
      </div>

      <div className="inline-flex rounded-md border border-border bg-card p-1">
        {(['matrice', 'role'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVue(v)}
            className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${vue === v ? 'bg-cream text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {v === 'matrice' ? 'Matrice par acteur' : 'Détail par rôle'}
          </button>
        ))}
      </div>

      {vue === 'matrice' ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-secondary text-left text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Menu / action</th>
                {rolesTries.map((r) => (
                  <th key={r.role_id} className="px-3 py-2 text-center">
                    {r.nom_role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-3" colSpan={rolesTries.length + 1}>
                        <Bloc className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : modules.map(([module, liste]) => (
                    <Fragment key={module}>
                      <tr className="border-t border-border bg-cream/60">
                        <td
                          className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary"
                          colSpan={rolesTries.length + 1}
                        >
                          {module}
                        </td>
                      </tr>
                      {liste.map((p) => (
                        <tr
                          key={p.permission_id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2">
                            <span className="block font-medium text-foreground">
                              {p.nom}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {p.code}
                            </span>
                          </td>
                          {rolesTries.map((r) => (
                            <td
                              key={r.role_id}
                              className="px-3 py-2 text-center"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#FF7900]"
                                aria-label={`${p.nom} pour ${r.nom_role}`}
                                checked={aDroit(r.role_id, p.permission_id)}
                                onChange={(e) =>
                                  basculer.mutate({
                                    role_id: r.role_id,
                                    permission_id: p.permission_id,
                                    actif: e.target.checked,
                                  })
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <KeyRound className="h-4 w-4" /> Rôles
            </p>
            {rolesTries.map((r) => (
              <button
                key={r.role_id}
                onClick={() => setRoleActif(r.role_id)}
                className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${selection === r.role_id ? 'bg-cream text-primary' : 'hover:bg-secondary'}`}
              >
                <span className="block font-semibold">{r.nom_role}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {r.code_role}
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            {modules.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Aucune permission définie.
              </p>
            ) : (
              modules.map(([module, liste]) => (
                <section key={module} className="mb-5">
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">
                      {module}
                    </h2>
                    <Etiquette
                      valeur={`${liste.filter((p) => accordees.has(p.permission_id)).length}/${liste.length}`}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {liste.map((p) => (
                      <label
                        key={p.permission_id}
                        className="flex items-center gap-3 rounded-md border border-border p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#FF7900]"
                          checked={accordees.has(p.permission_id)}
                          onChange={(e) =>
                            selection &&
                            basculer.mutate({
                              role_id: selection,
                              permission_id: p.permission_id,
                              actif: e.target.checked,
                            })
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {p.nom}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {p.code}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
