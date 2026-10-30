import { createFileRoute, Link } from '@tanstack/react-router'
import { ImageStockee } from '@/components/app/ImageStockee'
import { UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Bloc } from '@/components/app/Squelette'
import {
  EnteteAdmin,
  LigneInfo,
  SectionPanneau,
  dateFr,
} from '@/components/app/AdminKit'
import { useMonProfil } from './modifier-profil'

export const Route = createFileRoute('/_authenticated/profil')({
  head: () => ({
    meta: [
      { title: 'Mon profil ' },
      {
        name: 'description',
        content: 'Consultez vos informations personnelles et professionnelles.',
      },
      { property: 'og:title', content: 'Mon profil ' },
      {
        property: 'og:description',
        content: 'Consultez vos informations personnelles et professionnelles.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Page,
})

function Page() {
  const { data: profil, isLoading } = useMonProfil()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Bloc className="h-16 w-full" />
        <Bloc className="h-56 w-full" />
      </div>
    )
  }

  if (!profil) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Profil indisponible.
      </p>
    )
  }

  const initiales =
    `${profil.prenoms?.[0] ?? ''}${profil.nom?.[0] ?? ''}`.toUpperCase()
  const incomplet =
    !profil.telephone ||
    !profil.adresse ||
    !profil.genre ||
    (profil.participant &&
      (!profil.pro?.statut_actuel || !profil.pro?.niveau_education))

  return (
    <div className="space-y-5">
      <EnteteAdmin
        titre="Mon profil"
        description="Vos informations personnelles et professionnelles sur la plateforme."
        action={
          <Button asChild>
            <Link to="/modifier-profil">
              <UserPen /> Modifier mon profil
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
        {profil.url_profil ? (
          <ImageStockee
            src={profil.url_profil}
            alt="Photo de profil"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-cream text-xl font-bold text-primary">
            {initiales || '?'}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground">
            {profil.prenoms} {profil.nom}
          </p>
          <p className="text-sm text-muted-foreground">{profil.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {profil.roles.map((r) => (
              <span
                key={r}
                className="rounded-full bg-cream px-2 py-0.5 text-[10px] font-bold text-primary"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      {incomplet ? (
        <div className="rounded-lg border border-primary/40 bg-cream p-4 text-sm text-foreground">
          Votre profil est incomplet.{' '}
          <Link
            to="/modifier-profil"
            className="font-semibold text-primary underline"
          >
            Compléter maintenant
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <SectionPanneau titre="Informations personnelles">
            <LigneInfo libelle="Prénoms" valeur={profil.prenoms} />
            <LigneInfo libelle="Nom" valeur={profil.nom} />
            <LigneInfo libelle="Email" valeur={profil.email} />
            <LigneInfo libelle="Téléphone" valeur={profil.telephone ?? '—'} />
            <LigneInfo libelle="Adresse" valeur={profil.adresse ?? '—'} />
            <LigneInfo libelle="Genre" valeur={profil.genre ?? '—'} />
          </SectionPanneau>
        </div>

        {profil.participant ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <SectionPanneau titre="Profil participant">
              <LigneInfo
                libelle="Date de naissance"
                valeur={dateFr(profil.participant.date_naissance)}
              />
              <LigneInfo
                libelle="Statut actuel"
                valeur={profil.pro?.statut_actuel ?? '—'}
              />
              <LigneInfo
                libelle="Niveau d’étude"
                valeur={profil.pro?.niveau_education ?? '—'}
              />
              <LigneInfo
                libelle="Établissement"
                valeur={profil.pro?.institution ?? '—'}
              />
              <LigneInfo
                libelle="Spécialisation"
                valeur={profil.pro?.specialisation ?? '—'}
              />
              <LigneInfo
                libelle="Mention"
                valeur={profil.pro?.mention ?? '—'}
              />
            </SectionPanneau>
          </div>
        ) : null}

        {profil.formateur ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <SectionPanneau titre="Profil formateur">
              <LigneInfo
                libelle="Institution"
                valeur={profil.formateur.institution ?? '—'}
              />
              <LigneInfo
                libelle="Poste"
                valeur={profil.formateur.intitule_poste ?? '—'}
              />
              <LigneInfo
                libelle="Spécialisation"
                valeur={profil.formateur.specialisation ?? '—'}
              />
              <LigneInfo
                libelle="Expérience"
                valeur={
                  profil.formateur.annees_experience
                    ? `${profil.formateur.annees_experience} ans`
                    : '—'
                }
              />
            </SectionPanneau>
          </div>
        ) : null}

        {profil.responsable ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <SectionPanneau titre="Profil responsable">
              <LigneInfo
                libelle="Service"
                valeur={profil.responsable.service ?? '—'}
              />
              <LigneInfo
                libelle="Poste"
                valeur={profil.responsable.intitule_poste ?? '—'}
              />
            </SectionPanneau>
          </div>
        ) : null}
      </div>
    </div>
  )
}
