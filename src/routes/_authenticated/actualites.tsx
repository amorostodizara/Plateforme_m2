import { useEffect, useMemo, useRef, useState } from 'react'
import { estCheminStockage, useUrlFichier } from '@/lib/fichiers'
import { ImageStockee } from '@/components/app/ImageStockee'

import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  PlaySquare,
  Send,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SqueletteFil } from '@/components/app/Squelette'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useProfilCourant } from '@/components/app/AppShell'
import { quand } from '@/components/app/AdminKit'

export const Route = createFileRoute('/_authenticated/actualites')({
  head: () => ({
    meta: [
      { title: 'Fil d’actualité — Orange Digital Center' },
      {
        name: 'description',
        content:
          'Publications, annonces et actualités de la plateforme de formation.',
      },
      {
        property: 'og:title',
        content: 'Fil d’actualité — Orange Digital Center',
      },
      {
        property: 'og:description',
        content:
          'Suivez les annonces, réagissez et commentez les publications.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Actualites,
})

const REACTIONS = ["J'aime", "J'adore", 'Bravo', 'Intéressant'] as const
type Reaction = (typeof REACTIONS)[number]
const EMOJI: Record<Reaction, string> = {
  "J'aime": '👍',
  "J'adore": '❤️',
  Bravo: '👏',
  Intéressant: '💡',
}

const VISIBILITES = [
  'Public',
  'Participant',
  'Formateur',
  'Responsable',
  'Administrateur',
] as const

type Visibilite = (typeof VISIBILITES)[number]

const NIVEAUX_VISIBILITE: Record<Visibilite, number> = {
  Public: 0,
  Participant: 1,
  Formateur: 2,
  Responsable: 3,
  Administrateur: 4,
}

type Publication = {
  publication_id: number
  titre: string
  contenu: string | null
  publie_le: string
  statut: 'Brouillon' | 'Publiée' | 'Archivée'
  visibilite: Visibilite
  auteur_id: number | null
  auteur: { nom: string; prenoms: string; url_profil: string | null } | null
  media_publication:
    { media_id: number; url_media: string; type_media: string }[] | null
  commentaire_publication:
    | {
        commentaire_id: number
        utilisateur_id: number
        contenu: string
        statut: string
        cree_le: string
        utilisateur: { nom: string; prenoms: string } | null
      }[]
    | null
  reaction_publication:
    | { reaction_id: number; type_reaction: Reaction; utilisateur_id: number }[]
    | null
}

function niveauRole(roles: string[]) {
  if (roles.includes('ADMINISTRATEUR')) return 4
  if (roles.includes('RESPONSABLE')) return 3
  if (roles.includes('FORMATEUR')) return 2
  if (roles.includes('PARTICIPANT')) return 1

  return 0
}

function visibilitesAutorisees(roles: string[]): Visibilite[] {
  const niveau = niveauRole(roles)
  return VISIBILITES.filter(
    (visibilite) => NIVEAUX_VISIBILITE[visibilite] <= niveau,
  )
}

function peutVoirPublication(visibilite: Visibilite, roles: string[]) {
  const niveauUtilisateur = niveauRole(roles)
  const niveauPublication = NIVEAUX_VISIBILITE[visibilite]
  return niveauUtilisateur >= niveauPublication
}

function Actualites() {
  const queryClient = useQueryClient()
  const { data: profil } = useProfilCourant()
  const visibilitesDisponibles = useMemo(
    () => visibilitesAutorisees(profil?.roles ?? []),
    [profil?.roles],
  )
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  // const [visibilite, setVisibilite] =
  //   useState<Publication['visibilite']>('Public')
  const [visibilite, setVisibilite] = useState<Visibilite>('Public')

  const [fichiers, setFichiers] = useState<File[]>([])
  const [commentaires, setCommentaires] = useState<Record<number, string>>({})
  const [compositeurOuvert, setCompositeurOuvert] = useState(false)
  const [enEdition, setEnEdition] = useState<Publication | null>(null)
  const zoneTexte = useRef<HTMLTextAreaElement>(null)
  const initiales =
    `${profil?.prenoms?.[0] ?? ''}${profil?.nom?.[0] ?? ''}`.toUpperCase() ||
    'U'
  const apercus = useMemo(
    () =>
      fichiers.map((fichier) => ({
        fichier,
        url: URL.createObjectURL(fichier),
      })),
    [fichiers],
  )

  function peutSupprimerPublication(p: { auteur_id: number | null }) {
    if (!profil) return false
    const estModerateur = profil.roles?.includes('ADMINISTRATEUR')
    const estAuteur = p.auteur_id === profil.utilisateur_id
    return estModerateur || estAuteur
  }

  function ouvrirEdition(p: Publication) {
    setEnEdition(p)
    setTitre(p.titre)
    setContenu(p.contenu ?? '')
    const visibiliteAutorisee = visibilitesDisponibles.includes(p.visibilite)
    setVisibilite(
      visibiliteAutorisee
        ? p.visibilite
        : (visibilitesDisponibles[0] ?? 'Public'),
    )
    setFichiers([])
    setCompositeurOuvert(true)
    requestAnimationFrame(() => zoneTexte.current?.focus())
  }

  function fermerCompositeur() {
    setCompositeurOuvert(false)
    setEnEdition(null)
    setTitre('')
    setContenu('')
    setFichiers([])
  }

  useEffect(
    () => () => apercus.forEach((apercu) => URL.revokeObjectURL(apercu.url)),
    [apercus],
  )

  function ajouterFichiers(nouveaux: File[]) {
    const acceptes = nouveaux.filter(
      (fichier) =>
        fichier.type.startsWith('image/') || fichier.type.startsWith('video/'),
    )
    const tropGrands = acceptes.filter(
      (fichier) => fichier.size > 50 * 1024 * 1024,
    )
    if (tropGrands.length)
      toast.error('Chaque photo ou vidéo doit faire moins de 50 Mo.')
    const valides = acceptes.filter(
      (fichier) => fichier.size <= 50 * 1024 * 1024,
    )
    setFichiers((liste) => {
      const uniques = valides.filter(
        (fichier) =>
          !liste.some(
            (existant) =>
              existant.name === fichier.name && existant.size === fichier.size,
          ),
      )
      if (liste.length + uniques.length > 10)
        toast.error('Vous pouvez publier jusqu’à 10 médias à la fois.')
      return [...liste, ...uniques].slice(0, 10)
    })
    if (valides.length) setCompositeurOuvert(true)
  }

  const { data: publications = [], isLoading } = useQuery({
    queryKey: ['publications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publication')
        .select(
          'publication_id, titre, contenu, publie_le, statut, visibilite, auteur_id, auteur:utilisateur(nom, prenoms, url_profil), media_publication(media_id, url_media, type_media), commentaire_publication(commentaire_id,utilisateur_id, contenu, statut, cree_le, utilisateur:utilisateur(nom, prenoms)), reaction_publication(reaction_id, type_reaction, utilisateur_id)',
        )
        .order('publie_le', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Publication[]
    },
  })

  const publier = useMutation({
    mutationFn: async () => {
      if (!profil) {
        throw new Error('Profil introuvable.')
      }
      if (!visibilitesDisponibles.includes(visibilite)) {
        throw new Error('Vous n’êtes pas autorisé à utiliser cette visibilité.')
      }
      if (!contenu.trim() && fichiers.length === 0 && !enEdition)
        throw new Error('Ajoutez un message, une photo ou une vidéo.')
      const titrePublication =
        titre.trim() ||
        contenu.trim().split('\n')[0]?.slice(0, 100) ||
        (fichiers.some((fichier) => fichier.type.startsWith('video/'))
          ? 'Nouvelle vidéo'
          : 'Nouvelles photos')
      if (enEdition) {
        if (!titrePublication)
          throw new Error('Ajoutez un message à la publication.')
        const { error } = await supabase
          .from('publication')
          .update({
            titre: titrePublication,
            contenu: contenu.trim() || null,
            visibilite,
          })
          .eq('publication_id', enEdition.publication_id)
        if (error) throw error
        return
      }
      const { data: pub, error } = await supabase
        .from('publication')
        .insert({
          titre: titrePublication,
          contenu: contenu.trim() || null,
          visibilite,
          statut: 'Publiée',
          auteur_id: profil?.utilisateur_id ?? null,
        })
        .select('publication_id')
        .single()
      if (error) throw error

      const cheminsEnvoyes: string[] = []
      try {
        for (const [index, fichier] of fichiers.entries()) {
          const nomSur = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const chemin = `publications/${pub.publication_id}/${crypto.randomUUID()}-${index}-${nomSur}`
          const { error: eUp } = await supabase.storage
            .from('fichiers')
            .upload(chemin, fichier, {
              contentType: fichier.type,
              upsert: false,
            })
          if (eUp)
            throw new Error(
              `Envoi de « ${fichier.name} » impossible : ${eUp.message}`,
            )
          cheminsEnvoyes.push(chemin)
          const { error: eMedia } = await supabase
            .from('media_publication')
            .insert({
              publication_id: pub.publication_id,
              url_media: chemin,
              type_media: fichier.type.startsWith('video/') ? 'Vidéo' : 'Image',
              nom_fichier: fichier.name,
              taille_fichier: fichier.size,
            })
          if (eMedia)
            throw new Error(
              `Enregistrement de « ${fichier.name} » impossible : ${eMedia.message}`,
            )
        }
      } catch (erreur) {
        if (cheminsEnvoyes.length)
          await supabase.storage.from('fichiers').remove(cheminsEnvoyes)
        await supabase
          .from('publication')
          .delete()
          .eq('publication_id', pub.publication_id)
        throw erreur
      }
    },
    onSuccess: () => {
      toast.success(
        enEdition ? 'Publication modifiée.' : 'Publication ajoutée.',
      )
      fermerCompositeur()
      queryClient.invalidateQueries({ queryKey: ['publications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimerPublication = useMutation({
    mutationFn: async (p: Publication) => {
      const chemins = (p.media_publication ?? [])
        .map((m) =>
          m.url_media.includes('/object/sign/fichiers/')
            ? m.url_media.split('/object/sign/fichiers/')[1]?.split('?')[0]
            : estCheminStockage(m.url_media)
              ? m.url_media
              : undefined,
        )
        .filter((c): c is string => Boolean(c))
      const { error } = await supabase
        .from('publication')
        .delete()
        .eq('publication_id', p.publication_id)
      if (error) throw error
      if (chemins.length)
        await supabase.storage
          .from('fichiers')
          .remove(chemins.map((c) => decodeURIComponent(c)))
    },
    onSuccess: () => {
      toast.success('Publication supprimée.')
      queryClient.invalidateQueries({ queryKey: ['publications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reagir = useMutation({
    mutationFn: async ({
      publicationId,
      type,
    }: {
      publicationId: number
      type: Reaction
    }) => {
      if (!profil) throw new Error('Profil introuvable.')
      const { data: existante } = await supabase
        .from('reaction_publication')
        .select('reaction_id, type_reaction')
        .eq('publication_id', publicationId)
        .eq('utilisateur_id', profil.utilisateur_id)
        .maybeSingle()
      if (existante && existante.type_reaction === type) {
        const { error } = await supabase
          .from('reaction_publication')
          .delete()
          .eq('reaction_id', existante.reaction_id)
        if (error) throw error
      } else if (existante) {
        const { error } = await supabase
          .from('reaction_publication')
          .update({ type_reaction: type })
          .eq('reaction_id', existante.reaction_id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('reaction_publication').insert({
          publication_id: publicationId,
          utilisateur_id: profil.utilisateur_id,
          type_reaction: type,
        })
        if (error) throw error
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['publications'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const commenter = useMutation({
    mutationFn: async ({
      publicationId,
      texte,
    }: {
      publicationId: number
      texte: string
    }) => {
      if (!profil) throw new Error('Profil introuvable.')
      const { error } = await supabase.from('commentaire_publication').insert({
        publication_id: publicationId,
        utilisateur_id: profil.utilisateur_id,
        contenu: texte,
      })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      setCommentaires((c) => ({ ...c, [v.publicationId]: '' }))
      queryClient.invalidateQueries({ queryKey: ['publications'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimerCommentaire = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('commentaire_publication')
        .delete()
        .eq('commentaire_id', id)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['publications'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  function peutSupprimerCommentaire(c: { utilisateur_id: number }) {
    if (!profil) return false
    const estModerateur = profil.roles?.includes('ADMINISTRATEUR')
    const estAuteur = c.utilisateur_id === profil.utilisateur_id
    return estModerateur || estAuteur
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fil d’actualité</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Annonces, informations et activités de la plateforme.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-3 shadow-card">
        <div className="flex items-center gap-3">
          {profil?.url_profil ? (
            <ImageStockee
              src={profil.url_profil}
              alt="Votre profil"
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              {initiales}
            </span>
          )}
          <button
            onClick={() => {
              setCompositeurOuvert(true)
              requestAnimationFrame(() => zoneTexte.current?.focus())
            }}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-base font-bold text-foreground">
              Commencer à poster
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              Partagez vos images d’activités, vos idées…
            </span>
          </button>
          <label className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-md bg-cream px-3 text-xs font-semibold text-primary sm:flex">
            <ImageIcon className="h-4 w-4" />
            Photo
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                ajouterFichiers(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
          <label className="hidden h-9 cursor-pointer items-center gap-1.5 rounded-md bg-destructive/10 px-3 text-xs font-semibold text-destructive sm:flex">
            <PlaySquare className="h-4 w-4" />
            Vidéo
            <input
              type="file"
              multiple
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                ajouterFichiers(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </section>

      {compositeurOuvert ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
          <header className="flex h-11 items-center border-b border-border px-3">
            <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-sm bg-secondary text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="font-bold text-primary">
              {enEdition ? 'Modifier la publication' : 'Nouvelle publication'}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={fermerCompositeur}
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="p-4">
            <div className="flex items-start gap-3">
              {profil?.url_profil ? (
                <ImageStockee
                  src={profil.url_profil}
                  alt="Votre profil"
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                  {initiales}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {profil ? `${profil.prenoms} ${profil.nom}` : 'Utilisateur'}
                  </p>
                  <select
                    className="h-7 rounded-sm border border-input bg-card px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none"
                    value={visibilite}
                    onChange={(e) =>
                      setVisibilite(e.target.value as Visibilite)
                    }
                  >
                    {visibilitesDisponibles.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  ref={zoneTexte}
                  className="mt-3 min-h-32 w-full resize-y bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  placeholder="Écrire une publication…"
                />
              </div>
            </div>
            {apercus.length ? (
              <div
                className={`mt-3 grid gap-2 ${apercus.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}
              >
                {apercus.map(({ fichier, url }, i) => (
                  <div
                    key={`${fichier.name}-${fichier.size}`}
                    className="relative aspect-video overflow-hidden rounded-md border border-border bg-secondary"
                  >
                    {fichier.type.startsWith('image/') ? (
                      <img
                        src={url}
                        alt={`Aperçu ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <video src={url} className="h-full w-full object-cover" />
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        setFichiers((liste) => liste.filter((_, j) => j !== i))
                      }
                      className="absolute right-1 top-1 h-7 w-7 rounded-full"
                      aria-label={`Retirer ${fichier.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {!enEdition ? (
                <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-cream px-3 text-xs font-semibold text-primary">
                  <ImageIcon className="h-4 w-4" />
                  Photo
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      ajouterFichiers(Array.from(e.target.files ?? []))
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : null}
              {!enEdition ? (
                <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-destructive/10 px-3 text-xs font-semibold text-destructive">
                  <PlaySquare className="h-4 w-4" />
                  Vidéo
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      ajouterFichiers(Array.from(e.target.files ?? []))
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : null}
              <Button
                onClick={() => publier.mutate()}
                disabled={
                  publier.isPending ||
                  (!contenu.trim() && fichiers.length === 0)
                }
                className="ml-auto gap-2"
              >
                <span>
                  {publier.isPending
                    ? 'Publication…'
                    : enEdition
                      ? 'Enregistrer'
                      : 'Publier'}
                </span>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {isLoading ? <SqueletteFil /> : null}
      {publications
        .filter((p) => peutVoirPublication(p.visibilite, profil?.roles ?? []))
        .map((p) => {
          const maReaction = p.reaction_publication?.find(
            (r) => r.utilisateur_id === profil?.utilisateur_id,
          )?.type_reaction
          const visibles = (p.commentaire_publication ?? []).filter(
            (c) => c.statut === 'Visible',
          )
          return (
            <article
              key={p.publication_id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <header className="flex items-center gap-3">
                {p.auteur?.url_profil ? (
                  <ImageStockee
                    src={p.auteur.url_profil}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {`${p.auteur?.prenoms?.[0] ?? ''}${p.auteur?.nom?.[0] ?? ''}`.toUpperCase()}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {p.auteur
                      ? `${p.auteur.prenoms} ${p.auteur.nom}`
                      : 'Orange Digital Center'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quand(p.publie_le)} · {p.visibilite}
                  </p>
                </div>
                {peutSupprimerPublication(p) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-secondary"
                      aria-label="Options de la publication"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => ouvrirEdition(p)}
                      >
                        <Pencil />
                        Modifier la publication
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer background-delete"
                        onClick={() => supprimerPublication.mutate(p)}
                      >
                        <Trash2 />
                        Supprimer la publication
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </header>

              <h2 className="mt-3 text-sm font-bold text-foreground">
                {p.titre}
              </h2>
              {p.contenu ? (
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {p.contenu}
                </p>
              ) : null}

              {(p.media_publication ?? []).length ? (
                <div
                  className={`mt-3 grid overflow-hidden rounded-md ${(p.media_publication ?? []).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                >
                  {(p.media_publication ?? []).map((m) => (
                    <MediaPublication
                      key={m.media_id}
                      media={m}
                      seul={(p.media_publication ?? []).length === 1}
                    />
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {REACTIONS.map((r) => {
                  const total = (p.reaction_publication ?? []).filter(
                    (x) => x.type_reaction === r,
                  ).length
                  return (
                    <button
                      key={r}
                      onClick={() =>
                        reagir.mutate({
                          publicationId: p.publication_id,
                          type: r,
                        })
                      }
                      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${maReaction === r ? 'bg-cream text-primary' : 'border border-input hover:bg-secondary'}`}
                    >
                      <span>{EMOJI[r]}</span>
                      {r}
                      {total ? ` ${total}` : ''}
                    </button>
                  )
                })}
                <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {visibles.length} commentaire(s)
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {visibles.map((c) => (
                  <div
                    key={c.commentaire_id}
                    className="group rounded-md bg-secondary px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      {c.utilisateur
                        ? `${c.utilisateur.prenoms} ${c.utilisateur.nom}`
                        : 'Utilisateur'}
                      {peutSupprimerCommentaire(c) && (
                        <button
                          onClick={() =>
                            supprimerCommentaire.mutate(c.commentaire_id)
                          }
                          className="float-right hidden text-muted-foreground transition-colors hover:text-destructive group-hover:inline-flex"
                          aria-label="Supprimer le commentaire"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </p>

                    <p className="text-sm text-muted-foreground">{c.contenu}</p>
                  </div>
                ))}
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const texte = (commentaires[p.publication_id] ?? '').trim()
                    if (!texte) return
                    commenter.mutate({ publicationId: p.publication_id, texte })
                  }}
                >
                  <input
                    value={commentaires[p.publication_id] ?? ''}
                    onChange={(e) =>
                      setCommentaires((c) => ({
                        ...c,
                        [p.publication_id]: e.target.value,
                      }))
                    }
                    placeholder="Écrire un commentaire…"
                    className="h-9 flex-1 rounded-full border border-input bg-card px-4 text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
                    aria-label="Envoyer"
                  >
                    <ThumbsUp className="hidden" />
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </article>
          )
        })}
    </div>
  )
}

function MediaPublication({
  media,
  seul,
}: {
  media: { url_media: string; type_media: string }
  seul: boolean
}) {
  const { data: url } = useUrlFichier(media.url_media)
  if (!url)
    return <div className="aspect-square w-full animate-pulse bg-cream" />
  if (media.type_media === 'Image')
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt="Média de la publication"
          className={`w-full object-cover ${seul ? 'max-h-[32rem]' : 'aspect-square'}`}
        />
      </a>
    )
  if (media.type_media === 'Vidéo')
    return (
      <video src={url} controls className="aspect-video w-full object-cover" />
    )
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary hover:underline"
    >
      Ouvrir le document
    </a>
  )
}
