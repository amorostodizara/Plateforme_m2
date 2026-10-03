import { useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Pencil,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { fichierTropLourd, tailleLisible } from '@/lib/fichiers'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useDroits } from '@/components/app/AppShell'
import { Bloc } from '@/components/app/Squelette'
import {
  CarteStat,
  EnteteAdmin,
  MenuActions,
  champClass,
  dateHeureFr,
  labelClass,
  selectClass,
  LabelObligatoire,
} from '@/components/app/AdminKit'

export const Route = createFileRoute('/_authenticated/supports')({
  head: () => ({
    meta: [
      { title: 'Supports de formation — Orange Digital Center' },
      {
        name: 'description',
        content:
          'Consultez et gérez les documents pédagogiques associés à vos sessions de formation.',
      },
      {
        property: 'og:title',
        content: 'Supports de formation — Orange Digital Center',
      },
      {
        property: 'og:description',
        content:
          'Consultez et gérez les documents pédagogiques associés à vos sessions de formation.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Page,
})

type Support = {
  support_id: number
  formation_id: number
  session_id: number | null
  titre: string
  url_fichier: string
  nom_fichier: string | null
  taille_fichier: number | null
  type_support: string | null
  cree_le: string
  session: {
    session_id: number
    nom_session: string
    formation: { titre: string } | null
  } | null
}

type SessionListe = {
  session_id: number
  nom_session: string
  formation_id: number
  formateur_id: number | null
  formation: { titre: string } | null
}

function IconeFichier({ type }: { type: string | null }) {
  const t = (type ?? '').toLowerCase()
  const cls = 'h-6 w-6'
  if (t.includes('image'))
    return <FileImage className={`${cls} text-[#1A73E8]`} />
  if (t.includes('video'))
    return <FileVideo className={`${cls} text-[#C5221F]`} />
  if (t.includes('zip') || t.includes('rar'))
    return <FileArchive className={`${cls} text-muted-foreground`} />
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv'))
    return <FileSpreadsheet className={`${cls} text-[#137333]`} />
  return <FileText className={`${cls} text-primary`} />
}

function Page() {
  const queryClient = useQueryClient()
  const { profil, estGestionnaire, estFormateur } = useDroits()
  const champFichier = useRef<HTMLInputElement>(null)

  const [recherche, setRecherche] = useState('')
  const [sessionFiltre, setSessionFiltre] = useState('Toutes')
  const [ouvert, setOuvert] = useState(false)
  const [edite, setEdite] = useState<Support | null>(null)
  const [form, setForm] = useState({ titre: '', session_id: '' })
  const [fichier, setFichier] = useState<File | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const { data: supports = [], isLoading } = useQuery({
    queryKey: ['supports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_formation')
        .select(
          'support_id, formation_id, session_id, titre, url_fichier, nom_fichier, taille_fichier, type_support, cree_le, session:session_formation(session_id, nom_session, formation:formation(titre))',
        )
        .order('cree_le', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Support[]
    },
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['supports-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_formation')
        .select(
          'session_id, nom_session, formation_id, formateur_id, formation:formation(titre)',
        )
        .order('date_debut', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as SessionListe[]
    },
  })

  const peutGerer = estGestionnaire || estFormateur

  const enregistrer = useMutation({
    mutationFn: async () => {
      if (edite) {
        const { error } = await supabase
          .from('support_formation')
          .update({ titre: form.titre })
          .eq('support_id', edite.support_id)
        if (error) throw error
        return
      }
      if (!form.titre) throw new Error('Le titre est requis.')
      if (!fichier) throw new Error('Choisissez un fichier à téléverser.')
      if (!form.session_id) throw new Error('Choisissez la session concernée.')
      if (fichierTropLourd(fichier, 20))
        throw new Error('Le fichier dépasse 20 Mo.')
      const session = sessions.find(
        (s) => String(s.session_id) === form.session_id,
      )
      if (!session) throw new Error('Session introuvable.')

      const chemin = `supports/${session.session_id}/${Date.now()}-${fichier.name.replace(/[^\w.\-]/g, '_')}`
      const { error: erreurUpload } = await supabase.storage
        .from('fichiers')
        .upload(chemin, fichier, { upsert: false })
      if (erreurUpload) throw erreurUpload

      const { error } = await supabase.from('support_formation').insert({
        formation_id: session.formation_id,
        session_id: session.session_id,
        titre: form.titre.trim() || fichier.name,
        url_fichier: chemin,
        nom_fichier: fichier.name,
        taille_fichier: fichier.size,
        type_support: fichier.type || fichier.name.split('.').pop() || null,
        cree_par: profil?.utilisateur_id ?? null,
      })
      if (error) {
        await supabase.storage.from('fichiers').remove([chemin])
        throw error
      }
    },
    onSuccess: () => {
      toast.success(edite ? 'Support mis à jour.' : 'Support ajouté.')
      setOuvert(false)
      setEdite(null)
      setFichier(null)
      setForm({ titre: '', session_id: '' })
      queryClient.invalidateQueries({ queryKey: ['supports'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const supprimer = useMutation({
    mutationFn: async (s: Support) => {
      const { error } = await supabase
        .from('support_formation')
        .delete()
        .eq('support_id', s.support_id)
      if (error) throw error
      await supabase.storage.from('fichiers').remove([s.url_fichier])
    },
    onSuccess: () => {
      toast.success('Support supprimé.')
      queryClient.invalidateQueries({ queryKey: ['supports'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function telecharger(s: Support) {
    setEnvoi(true)
    const { data, error } = await supabase.storage
      .from('fichiers')
      .createSignedUrl(s.url_fichier, 60, { download: s.nom_fichier ?? true })
    setEnvoi(false)
    if (error || !data) {
      toast.error('Vous n’avez pas accès à ce fichier.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const affiches = useMemo(
    () =>
      supports.filter((s) => {
        if (
          sessionFiltre !== 'Toutes' &&
          String(s.session_id) !== sessionFiltre
        )
          return false
        const champ =
          `${s.titre} ${s.nom_fichier ?? ''} ${s.session?.nom_session ?? ''} ${s.session?.formation?.titre ?? ''}`.toLowerCase()
        return !recherche || champ.includes(recherche.toLowerCase())
      }),
    [supports, recherche, sessionFiltre],
  )

  const sessionsGerables = peutGerer ? sessions : []
  const volume = supports.reduce((t, s) => t + (s.taille_fichier ?? 0), 0)

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Supports de formation"
        description="Documents pédagogiques des sessions : consultation, téléchargement et gestion des fichiers."
        action={
          peutGerer ? (
            <Button
              onClick={() => {
                setEdite(null)
                setForm({ titre: '', session_id: '' })
                setFichier(null)
                setOuvert(true)
              }}
            >
              <Upload /> Ajouter un support
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CarteStat libelle="Supports disponibles" valeur={supports.length} />
        <CarteStat
          libelle="Sessions concernées"
          valeur={new Set(supports.map((s) => s.session_id)).size}
        />
        <CarteStat libelle="Volume total" valeur={tailleLisible(volume)} />
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un support"
            className={`${champClass} pl-9`}
          />
        </div>
        <select
          className={`${selectClass} w-full sm:w-64`}
          value={sessionFiltre}
          onChange={(e) => setSessionFiltre(e.target.value)}
        >
          <option value="Toutes">Toutes les sessions</option>
          {sessions.map((s) => (
            <option key={s.session_id} value={String(s.session_id)}>
              {s.nom_session}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4"
            >
              <Bloc className="h-6 w-6" />
              <Bloc className="mt-3 h-4 w-32" />
              <Bloc className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : affiches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Aucun support disponible
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les supports apparaissent ici pour les sessions auxquelles vous avez
            accès.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {affiches.map((s) => (
            <article
              key={s.support_id}
              className="flex flex-col rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <IconeFichier type={s.type_support} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.titre}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.nom_fichier ?? '—'}
                  </p>
                </div>
                {peutGerer ? (
                  <MenuActions>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        setEdite(s)
                        setForm({
                          titre: s.titre,
                          session_id: String(s.session_id ?? ''),
                        })
                        setOuvert(true)
                      }}
                    >
                      <Pencil /> Renommer le support
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => telecharger(s)}
                    >
                      <Download /> Télécharger
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => supprimer.mutate(s)}
                      className="background-delete cursor-pointer"
                    >
                      <Trash2 /> Supprimer
                    </DropdownMenuItem>
                  </MenuActions>
                ) : null}
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                <p className="truncate">{s.session?.formation?.titre ?? '—'}</p>
                <p className="truncate">
                  {s.session?.nom_session ?? 'Session non précisée'}
                </p>
                <p>
                  {tailleLisible(s.taille_fichier)} · Ajouté le{' '}
                  {dateHeureFr(s.cree_le)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={envoi}
                onClick={() => telecharger(s)}
              >
                <Download /> Ouvrir
              </Button>
            </article>
          ))}
        </div>
      )}

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
              {edite ? 'Renommer le support' : 'Ajouter un support'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Nom du support
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="Ex. Introduction à React"
              />
            </div>
            {!edite ? (
              <>
                <div>
                  <label className={labelClass}>
                    Session concernée
                    <LabelObligatoire />
                  </label>
                  <select
                    className={`${selectClass} w-full`}
                    value={form.session_id}
                    onChange={(e) =>
                      setForm({ ...form, session_id: e.target.value })
                    }
                  >
                    <option value="">Choisir une session</option>
                    {sessionsGerables.map((s) => (
                      <option key={s.session_id} value={String(s.session_id)}>
                        {s.nom_session} — {s.formation?.titre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    Fichier (20 Mo maximum)
                    <LabelObligatoire />
                  </label>
                  <input
                    ref={champFichier}
                    type="file"
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-cream file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
                    onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
                  />
                  {fichier ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {fichier.name} · {tailleLisible(fichier.size)}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => enregistrer.mutate()}
              disabled={enregistrer.isPending}
            >
              {enregistrer.isPending
                ? 'Envoi…'
                : edite
                  ? 'Enregistrer'
                  : 'Téléverser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
