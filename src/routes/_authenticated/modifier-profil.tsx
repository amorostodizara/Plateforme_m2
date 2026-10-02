import { useEffect, useState } from 'react'
import { ImageStockee } from '@/components/app/ImageStockee'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Save, UserPen } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Bloc } from '@/components/app/Squelette'
import {
  EnteteAdmin,
  champClass,
  labelClass,
  selectClass,
  calculerAge,
  LabelObligatoire,
} from '@/components/app/AdminKit'
import {
  fichierTropLourd,
  ouvrirFichier,
  tailleLisible,
  televerserFichier,
} from '@/lib/fichiers'

export const Route = createFileRoute('/_authenticated/modifier-profil')({
  head: () => ({
    meta: [
      { title: 'Modifier profil — Orange Digital Center' },
      {
        name: 'description',
        content:
          'Complétez et mettez à jour vos informations personnelles et professionnelles.',
      },
      {
        property: 'og:title',
        content: 'Modifier profil — Orange Digital Center',
      },
      {
        property: 'og:description',
        content:
          'Complétez et mettez à jour vos informations personnelles et professionnelles.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Page,
})

export type MonProfil = {
  utilisateur_id: number
  nom: string
  prenoms: string
  email: string
  telephone: string | null
  adresse: string | null
  genre: string | null
  url_profil: string | null
  roles: string[]
  participant: { participant_id: number; date_naissance: string | null } | null
  pro: {
    statut_actuel: string | null
    institution: string | null
    specialisation: string | null
    mention: string | null
    niveau_education: string | null
  } | null
  formateur: {
    formateur_id: number
    institution: string | null
    intitule_poste: string | null
    specialisation: string | null
    annees_experience: number | null
    curriculum_vitae: string | null
  } | null
  responsable: {
    responsable_id: number
    service: string | null
    intitule_poste: string | null
  } | null
}

export function useMonProfil() {
  return useQuery({
    queryKey: ['mon-profil'],
    queryFn: async (): Promise<MonProfil | null> => {
      const { data: auth } = await supabase.auth.getUser()
      const authId = auth.user?.id
      if (!authId) return null

      const { data: u } = await supabase
        .from('utilisateur')
        .select(
          'utilisateur_id, nom, prenoms, email, telephone, adresse, genre, url_profil',
        )
        .eq('auth_user_id', authId)
        .maybeSingle()
      if (!u) return null

      const [{ data: roles }, { data: part }, { data: form }, { data: resp }] =
        await Promise.all([
          supabase
            .from('role_utilisateur')
            .select('role:role(code_role)')
            .eq('utilisateur_id', u.utilisateur_id),
          supabase
            .from('participant')
            .select('participant_id, date_naissance')
            .eq('utilisateur_id', u.utilisateur_id)
            .maybeSingle(),
          supabase
            .from('formateur')
            .select(
              'formateur_id, institution, intitule_poste, specialisation, annees_experience, curriculum_vitae',
            )
            .eq('utilisateur_id', u.utilisateur_id)
            .maybeSingle(),
          supabase
            .from('responsable')
            .select('responsable_id, service, intitule_poste')
            .eq('utilisateur_id', u.utilisateur_id)
            .maybeSingle(),
        ])

      let pro: MonProfil['pro'] = null
      if (part) {
        const { data } = await supabase
          .from('profil_professionnel')
          .select(
            'statut_actuel, institution, specialisation, mention, niveau_education',
          )
          .eq('participant_id', part.participant_id)
          .maybeSingle()
        pro = data ?? null
      }

      return {
        ...u,
        roles: ((roles ?? []) as { role: { code_role: string } | null }[]).map(
          (r) => r.role?.code_role ?? '',
        ),
        participant: part ?? null,
        pro,
        formateur: form ?? null,
        responsable: resp ?? null,
      }
    },
  })
}

const vide = {
  nom: '',
  prenoms: '',
  telephone: '',
  adresse: '',
  genre: '',
  date_naissance: '',
  statut_actuel: '',
  institution: '',
  specialisation: '',
  mention: '',
  niveau_education: '',
  f_institution: '',
  f_poste: '',
  f_specialisation: '',
  f_experience: '',
  f_cv: '',
  r_service: '',
  r_poste: '',
}

function Page() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: profil, isLoading } = useMonProfil()
  const [form, setForm] = useState(vide)
  const [photo, setPhoto] = useState<string | null>(null)
  const [envoiPhoto, setEnvoiPhoto] = useState(false)
  const [cv, setCv] = useState<File | null>(null)

  useEffect(() => {
    if (!profil) return
    setForm({
      nom: profil.nom ?? '',
      prenoms: profil.prenoms ?? '',
      telephone: profil.telephone ?? '',
      adresse: profil.adresse ?? '',
      genre: profil.genre ?? '',
      date_naissance: profil.participant?.date_naissance ?? '',
      statut_actuel: profil.pro?.statut_actuel ?? '',
      institution: profil.pro?.institution ?? '',
      specialisation: profil.pro?.specialisation ?? '',
      mention: profil.pro?.mention ?? '',
      niveau_education: profil.pro?.niveau_education ?? '',
      f_institution: profil.formateur?.institution ?? '',
      f_poste: profil.formateur?.intitule_poste ?? '',
      f_specialisation: profil.formateur?.specialisation ?? '',
      f_experience: profil.formateur?.annees_experience
        ? String(profil.formateur.annees_experience)
        : '',
      f_cv: profil.formateur?.curriculum_vitae ?? '',
      r_service: profil.responsable?.service ?? '',
      r_poste: profil.responsable?.intitule_poste ?? '',
    })
    setPhoto(profil.url_profil ?? null)
  }, [profil])

  async function envoyerPhoto(fichier: File) {
    if (!fichier.type.startsWith('image/')) {
      toast.error('Choisissez une image.')
      return
    }
    if (fichierTropLourd(fichier, 1)) {
      toast.error('Image trop lourde (1 Mo maximum).')
      return
    }
    setEnvoiPhoto(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const chemin = `profils/${auth.user?.id}/${Date.now()}-${fichier.name.replace(/[^\w.-]/g, '_')}`
      const { error } = await supabase.storage
        .from('fichiers')
        .upload(chemin, fichier, { contentType: fichier.type })
      if (error) throw error
      setPhoto(chemin)
      toast.success('Photo prête. Enregistrez pour la conserver.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEnvoiPhoto(false)
    }
  }

  const enregistrer = useMutation({
    mutationFn: async () => {
      if (!profil) throw new Error('Profil introuvable.')

      if (
        !form.nom.trim() ||
        !form.prenoms.trim() ||
        !form.telephone.trim() ||
        !form.adresse ||
        !form.genre
      )
        throw new Error(
          'Le nom, prénom(s), telephone, adresse, genre ne doit pas être vides.',
        )
      // Téléphone : exactement 10 chiffres et commence par 03
      if (!/^03\d{8}$/.test(form.telephone)) {
        throw new Error(
          'Le numéro doit contenir exactement 10 chiffres et commencer par 03.',
        )
      }
      if (
        !form.date_naissance ||
        !form.statut_actuel ||
        !form.niveau_education ||
        !form.institution ||
        !form.specialisation
      )
        throw new Error(
          'Date de naissance, statut actuel, niveau etude, Institution ou établissement, et le specialisation sont obligatoires.',
        )

      // Âge minimum : 10 ans
      if (calculerAge(form.date_naissance) < 10) {
        throw new Error('Le participant doit avoir au minimum 10 ans.')
      }
      if (!form.f_institution || !form.f_specialisation)
        throw new Error('Organisation ou Entité  sont obligatoires.')

      if (!form.r_service) throw new Error('Le service est obligatoire.')

      const { error: e1 } = await supabase
        .from('utilisateur')
        .update({
          nom: form.nom.trim(),
          prenoms: form.prenoms.trim(),
          telephone: form.telephone || null,
          adresse: form.adresse || null,
          genre: (form.genre || null) as 'Homme' | 'Femme' | null,
          url_profil: photo,
        })
        .eq('utilisateur_id', profil.utilisateur_id)
      if (e1) throw e1

      if (profil.participant) {
        const { error: e2 } = await supabase
          .from('participant')
          .update({ date_naissance: form.date_naissance || null })
          .eq('participant_id', profil.participant.participant_id)
        if (e2) throw e2

        const valeurs = {
          participant_id: profil.participant.participant_id,
          statut_actuel: (form.statut_actuel || null) as never,
          institution: form.institution || null,
          specialisation: form.specialisation || null,
          mention: form.mention || null,
          niveau_education: (form.niveau_education || null) as never,
        }
        const { error: e3 } = profil.pro
          ? await supabase
              .from('profil_professionnel')
              .update(valeurs)
              .eq('participant_id', profil.participant.participant_id)
          : await supabase.from('profil_professionnel').insert(valeurs)
        if (e3) throw e3
      }

      if (profil.formateur) {
        let cheminCv = form.f_cv || null
        if (cv) {
          const estPdf =
            cv.type === 'application/pdf' ||
            cv.name.toLowerCase().endsWith('.pdf')
          if (!estPdf) throw new Error('Le CV doit être un fichier PDF.')
          cheminCv = await televerserFichier('cv-formateurs', cv, 1)
        }
        const { error } = await supabase
          .from('formateur')
          .update({
            institution: form.f_institution || null,
            intitule_poste: form.f_poste || null,
            specialisation: form.f_specialisation || null,
            annees_experience: form.f_experience
              ? Number(form.f_experience)
              : null,
            curriculum_vitae: cheminCv,
          })
          .eq('formateur_id', profil.formateur.formateur_id)
        if (error) throw error
      }

      if (profil.responsable) {
        const { error } = await supabase
          .from('responsable')
          .update({
            service: form.r_service || null,
            intitule_poste: form.r_poste || null,
          })
          .eq('responsable_id', profil.responsable.responsable_id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Profil enregistré.')
      queryClient.invalidateQueries({ queryKey: ['mon-profil'] })
      queryClient.invalidateQueries({ queryKey: ['profil-courant'] })
      void navigate({ to: '/profil' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Bloc className="h-16 w-full" />
        <Bloc className="h-64 w-full" />
      </div>
    )
  }

  const initiales =
    `${profil?.prenoms?.[0] ?? ''}${profil?.nom?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Modifier mon profil"
        description="Complétez vos informations personnelles et professionnelles. Elles ne vous seront plus redemandées."
        action={
          <Button
            onClick={() => enregistrer.mutate()}
            disabled={enregistrer.isPending}
          >
            <Save /> Enregistrer
          </Button>
        }
      />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <UserPen className="h-4 w-4" /> Informations personnelles
        </h2>
        <div className="mb-4 flex items-center gap-4">
          {photo ? (
            <ImageStockee
              src={photo}
              alt="Photo de profil"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-lg font-bold text-primary">
              {initiales || '?'}
            </span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary">
            <ImagePlus className="h-4 w-4" />{' '}
            {envoiPhoto ? 'Envoi…' : 'Changer la photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void envoyerPhoto(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Prénoms <LabelObligatoire />
            </label>
            <input
              className={champClass}
              value={form.prenoms}
              onChange={(e) => setForm({ ...form, prenoms: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Nom
              <LabelObligatoire />
            </label>
            <input
              className={champClass}
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Adresse email</label>
            <input
              className={champClass}
              value={profil?.email ?? ''}
              disabled
            />
          </div>
          <div>
            <label className={labelClass}>
              Téléphone
              <LabelObligatoire />
            </label>
            <input
              className={champClass}
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="0320711038"
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
              placeholder="Andrainjato-Fianarantsoa"
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
        </div>
      </section>

      {profil?.participant ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            Profil participant
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
                Établissement / Institution
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.institution}
                onChange={(e) =>
                  setForm({ ...form, institution: e.target.value })
                }
                placeholder="ENI"
              />
            </div>
            <div>
              <label className={labelClass}>
                Spécialisation
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.specialisation}
                onChange={(e) =>
                  setForm({ ...form, specialisation: e.target.value })
                }
                placeholder="Développeur web"
              />
            </div>
            <div>
              <label className={labelClass}>Mention</label>
              <input
                className={champClass}
                value={form.mention}
                onChange={(e) => setForm({ ...form, mention: e.target.value })}
                placeholder="Informatique"
              />
            </div>
          </div>
        </section>
      ) : null}

      {profil?.formateur ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            Profil formateur
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Organisation / Entité
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.f_institution}
                onChange={(e) =>
                  setForm({ ...form, f_institution: e.target.value })
                }
                placeholder=" Orange Madagascar"
              />
            </div>
            <div>
              <label className={labelClass}>Intitulé du poste</label>
              <input
                className={champClass}
                value={form.f_poste}
                onChange={(e) => setForm({ ...form, f_poste: e.target.value })}
                placeholder="Assistant administratif"
              />
            </div>
            <div>
              <label className={labelClass}>
                Spécialisation
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.f_specialisation}
                onChange={(e) =>
                  setForm({ ...form, f_specialisation: e.target.value })
                }
                placeholder="Développeur web"
              />
            </div>
            <div>
              <label className={labelClass}>Années d’expérience</label>
              <input
                type="number"
                min={0}
                className={champClass}
                value={form.f_experience}
                onChange={(e) =>
                  setForm({ ...form, f_experience: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Curriculum vitae (fichier PDF, 1 Mo maximum)
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-cream file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
                onChange={(e) => setCv(e.target.files?.[0] ?? null)}
              />
              {cv ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {cv.name} · {tailleLisible(cv.size)}
                </p>
              ) : form.f_cv ? (
                <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  CV enregistré —
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={async () => {
                      const ok = await ouvrirFichier(form.f_cv)
                      if (!ok) toast.error('Impossible d’ouvrir ce CV.')
                    }}
                  >
                    ouvrir
                  </button>
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {profil?.responsable ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            Profil responsable
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Service
                <LabelObligatoire />
              </label>
              <input
                className={champClass}
                value={form.r_service}
                onChange={(e) =>
                  setForm({ ...form, r_service: e.target.value })
                }
                placeholder="ODC-UF"
              />
            </div>
            <div>
              <label className={labelClass}>Intitulé du poste</label>
              <input
                className={champClass}
                value={form.r_poste}
                onChange={(e) => setForm({ ...form, r_poste: e.target.value })}
                placeholder="Assistant administratif"
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => void navigate({ to: '/profil' })}
        >
          Annuler
        </Button>
        <Button
          onClick={() => enregistrer.mutate()}
          disabled={enregistrer.isPending}
        >
          <Save /> Enregistrer
        </Button>
      </div>
    </div>
  )
}
