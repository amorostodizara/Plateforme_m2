import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
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
  champClass,
  labelClass,
  selectClass,
  LabelObligatoire,
} from '@/components/app/AdminKit'
import { AccesReserve } from '@/components/app/Acces'
import { ImageFormation } from '@/components/app/ImageFormation'
import {
  supprimerFichier,
  tailleLisible,
  televerserFichier,
} from '@/lib/fichiers'

const champFichierClass =
  'block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-cream file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary'

export const Route = createFileRoute('/_authenticated/formations')({
  head: () => ({
    meta: [
      { title: 'Gestion des formations — Orange Digital Center' },
      {
        name: 'description',
        content: 'Créez, publiez et archivez les formations de la plateforme.',
      },
      {
        property: 'og:title',
        content: 'Gestion des formations — Orange Digital Center',
      },
      {
        property: 'og:description',
        content: 'Créez, publiez et archivez les formations de la plateforme.',
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

type Niveau = 'Débutant' | 'Intermédiaire' | 'Avancé'
type StatutF = 'Brouillon' | 'Publiée' | 'Archivée'

type Formation = {
  formation_id: number
  titre: string
  description: string | null
  niveau: Niveau
  url_image: string | null
  statut: StatutF
  categorie_id: number | null
  categorie: { nom: string } | null
  sessions: { session_id: number }[] | null
}

const vide = {
  titre: '',
  description: '',
  niveau: 'Débutant' as Niveau,
  url_image: '',
  statut: 'Brouillon' as StatutF,
  categorie_id: '' as string,
}

function Page() {
  const queryClient = useQueryClient()
  const [recherche, setRecherche] = useState('')
  const [statutFiltre, setStatutFiltre] = useState('Tous')
  const [ouvert, setOuvert] = useState(false)
  const [edite, setEdite] = useState<number | null>(null)
  const [form, setForm] = useState(vide)
  const [image, setImage] = useState<File | null>(null)

  const { data: formations = [], isLoading } = useQuery({
    queryKey: ['admin-formations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formation')
        .select(
          'formation_id, titre, description, niveau, url_image, statut, categorie_id, categorie:categorie_formation(nom), sessions:session_formation(session_id)',
        )
        .order('titre')
      if (error) throw error
      return (data ?? []) as unknown as Formation[]
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorie_formation')
        .select('categorie_id, nom')
        .order('nom')
      if (error) throw error
      return data ?? []
    },
  })

  const enregistrer = useMutation({
    mutationFn: async () => {
      if (!form.titre.trim()) throw new Error('Le titre est obligatoire.')
      if (!form.niveau.trim()) throw new Error('Le niveau est obligatoire.')
      if (!form.statut.trim()) throw new Error('Le statut est obligatoire.')
      let chemin = form.url_image || null

      if (image) {
        if (!image.type.startsWith('image/'))
          throw new Error('Choisissez une image (JPG, PNG, WEBP).')
        chemin = await televerserFichier('formations', image, 1)
      }
      const valeurs = {
        titre: form.titre.trim(),
        description: form.description || null,
        niveau: form.niveau,
        url_image: chemin,
        statut: form.statut,
        categorie_id: form.categorie_id ? Number(form.categorie_id) : null,
      }
      const { error } = edite
        ? await supabase
            .from('formation')
            .update(valeurs)
            .eq('formation_id', edite)
        : await supabase.from('formation').insert(valeurs)
      if (error) {
        if (image && chemin) await supprimerFichier(chemin)
        throw error
      }
      if (image && form.url_image && form.url_image !== chemin)
        await supprimerFichier(form.url_image)
    },
    onSuccess: () => {
      toast.success(edite ? 'Formation modifiée.' : 'Formation créée.')
      setOuvert(false)
      setEdite(null)
      setForm(vide)
      setImage(null)
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const changerStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: StatutF }) => {
      const { error } = await supabase
        .from('formation')
        .update({ statut })
        .eq('formation_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Statut mis à jour.')
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimer = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('formation')
        .delete()
        .eq('formation_id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Formation supprimée.')
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const affichees = useMemo(
    () =>
      formations.filter((f) => {
        if (statutFiltre !== 'Tous' && f.statut !== statutFiltre) return false
        if (
          recherche &&
          !f.titre.toLowerCase().includes(recherche.toLowerCase())
        )
          return false
        return true
      }),
    [formations, recherche, statutFiltre],
  )

  function ouvrirEdition(f: Formation) {
    setEdite(f.formation_id)
    setForm({
      titre: f.titre,
      description: f.description ?? '',
      niveau: f.niveau,
      url_image: f.url_image ?? '',
      statut: f.statut,
      categorie_id: f.categorie_id ? String(f.categorie_id) : '',
    })
    setImage(null)
    setOuvert(true)
  }

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Gestion des formations"
        description="Créez, modifiez, publiez et archivez les formations de la plateforme."
        action={
          <Button
            onClick={() => {
              setEdite(null)
              setForm(vide)
              setImage(null)
              setOuvert(true)
            }}
          >
            <Plus /> Nouvelle formation
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStat libelle="Total" valeur={formations.length} />
        <CarteStat
          libelle="Publiées"
          valeur={formations.filter((f) => f.statut === 'Publiée').length}
        />
        <CarteStat
          libelle="Brouillons"
          valeur={formations.filter((f) => f.statut === 'Brouillon').length}
        />
        <CarteStat
          libelle="Archivées"
          valeur={formations.filter((f) => f.statut === 'Archivée').length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une formation"
            className={`${champClass} pl-9`}
          />
        </div>
        <select
          className={selectClass}
          value={statutFiltre}
          onChange={(e) => setStatutFiltre(e.target.value)}
        >
          {['Tous', 'Brouillon', 'Publiée', 'Archivée'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-secondary">
              <tr>
                {[
                  'Formation',
                  'Catégorie',
                  'Niveau',
                  'Sessions',
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
              ) : affichees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    Aucune formation.
                  </td>
                </tr>
              ) : (
                affichees.map((f) => (
                  <tr
                    key={f.formation_id}
                    className="border-t border-border hover:bg-secondary/50"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{f.titre}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {f.description}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {f.categorie?.nom ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">{f.niveau}</td>
                    <td className="px-3 py-3 text-xs">
                      {f.sessions?.length ?? 0}
                    </td>
                    <td className="px-3 py-3">
                      <Etiquette valeur={f.statut} />
                    </td>
                    <td className="px-3 py-3">
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
                          <DropdownMenuItem onClick={() => ouvrirEdition(f)}>
                            <Pencil /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              changerStatut.mutate({
                                id: f.formation_id,
                                statut: 'Publiée',
                              })
                            }
                          >
                            <Send /> Publier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              changerStatut.mutate({
                                id: f.formation_id,
                                statut: 'Archivée',
                              })
                            }
                          >
                            <Archive /> Archiver
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => supprimer.mutate(f.formation_id)}
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
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

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {edite ? 'Modifier la formation' : 'Nouvelle formation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Titre <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Catégorie</label>
                <select
                  className={`${selectClass} w-full`}
                  value={form.categorie_id}
                  onChange={(e) =>
                    setForm({ ...form, categorie_id: e.target.value })
                  }
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => (
                    <option key={c.categorie_id} value={c.categorie_id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Niveau
                  <LabelObligatoire />
                </label>
                <select
                  className={`${selectClass} w-full`}
                  value={form.niveau}
                  onChange={(e) =>
                    setForm({ ...form, niveau: e.target.value as Niveau })
                  }
                >
                  {['Débutant', 'Intermédiaire', 'Avancé'].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Statut
                <LabelObligatoire />
              </label>
              <select
                className={`${selectClass} w-full`}
                value={form.statut}
                onChange={(e) =>
                  setForm({ ...form, statut: e.target.value as StatutF })
                }
              >
                {['Brouillon', 'Publiée', 'Archivée'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>
                Image de présentation (fichier, 1 Mo maximum)
              </label>
              <input
                type="file"
                accept="image/*"
                className={champFichierClass}
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
              {image ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {image.name} · {tailleLisible(image.size)}
                </p>
              ) : form.url_image ? (
                <div className="mt-2 flex items-center gap-2">
                  <ImageFormation
                    urlImage={form.url_image}
                    alt="Image actuelle"
                    className="h-16 w-24 rounded-md object-cover"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Image actuelle — choisissez un fichier pour la remplacer.
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Sans image, un visuel par défaut de la catégorie est utilisé.
                </p>
              )}
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
