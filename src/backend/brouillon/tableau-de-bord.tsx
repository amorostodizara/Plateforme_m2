import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/integrations/supabase/client'
import { COULEURS } from '@/lib/images-formation'
import {
  SqueletteCartes,
  SqueletteGraphiques,
} from '@/components/app/Squelette'
import { AccesReserve } from '@/components/app/Acces'
import { CarteDash } from '@/components/app/AdminKit'
export const Route = createFileRoute('/_authenticated/tableau-de-bord')({
  head: () => ({
    meta: [
      { title: 'Dashboard — Suivi des formations' },
      {
        name: 'description',
        content:
          'Statistiques des inscriptions, bénéficiaires, formations, formateurs et attestations.',
      },
      { property: 'og:title', content: 'Dashboard — Suivi des formations' },
      {
        property: 'og:description',
        content:
          'Indicateurs et graphiques de suivi des activités de formation.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => (
    <AccesReserve roles={['ADMINISTRATEUR', 'RESPONSABLE']}>
      <Dashboard />
    </AccesReserve>
  ),
})

const MOIS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
]

const STATUTS_ACTUELS = [
  'Étudiant',
  'Employé',
  'Fonctionnaire',
  'Chômeur',
  'Indépendant',
  'Entrepreneur',
  'Autre',
]

type LigneInscription = {
  inscription_id: number
  statut: string
  date_inscription: string

  session: {
    session_id: number
    date_debut: string
    formation: {
      formation_id: number
      titre: string
    } | null
  } | null

  participant: {
    participant_id: number
    utilisateur: {
      genre: string | null
    } | null
    profil_professionnel:
      | {
          statut_actuel: string | null
        }[]
      | null
  } | null

  presence:
    | {
        presence_id: number
        present: boolean
        statut: string
      }[]
    | null
}

function Bloc({
  titre,
  children,
}: {
  titre: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-foreground">{titre}</h2>
      <div className="mt-3 h-64">{children}</div>
    </div>
  )
}

function Dashboard() {
  const [annee, setAnnee] = useState('Toutes')
  const [mois, setMois] = useState('Tous')
  const [categorie, setCategorie] = useState('Toutes')
  const [formation, setFormation] = useState('Toutes')
  const [filtres, setFiltres] = useState({
    annee: 'Toutes',
    mois: 'Tous',
    categorie: 'Toutes',
    formation: 'Toutes',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [insc, form, formateurs, attest] = await Promise.all([
        supabase.from('inscription').select(
          `
  inscription_id,
  statut,
  date_inscription,

  session:session_formation(
    session_id,
    date_debut,
    formation:formation(
      formation_id,
      titre
    )
  ),

  participant:participant(
    participant_id,
    utilisateur:utilisateur(
      genre
    ),
    profil_professionnel(
      statut_actuel
    )
  ),

  presence(
    presence_id,
    present,
    statut
  )
  `,
        ),
        supabase
          .from('formation')
          .select('formation_id, titre, categorie:categorie_formation(nom)'),
        supabase.from('formateur').select('formateur_id'),
        supabase.from('attestation').select('attestation_id'),
      ])

      return {
        inscriptions: (insc.data ?? []) as unknown as LigneInscription[],
        formations: (form.data ?? []) as unknown as {
          formation_id: number
          titre: string
          categorie: { nom: string } | null
        }[],
        nbFormateurs: formateurs.data?.length ?? 0,
        nbAttestations: attest.data?.length ?? 0,
      }
    },
  })

  const inscriptions = data?.inscriptions ?? []
  const formations = data?.formations ?? []

  const annees = useMemo(() => {
    const ens = new Set<string>()
    inscriptions.forEach((i) =>
      ens.add(new Date(i.date_inscription).getFullYear().toString()),
    )
    ens.add(new Date().getFullYear().toString())
    return Array.from(ens).sort().reverse()
  }, [inscriptions])

  const filtrees = useMemo(() => {
    return inscriptions.filter((i) => {
      const d = new Date(i.date_inscription)
      if (
        filtres.annee !== 'Toutes' &&
        d.getFullYear().toString() !== filtres.annee
      )
        return false
      if (filtres.mois !== 'Tous' && MOIS[d.getMonth()] !== filtres.mois)
        return false
      if (filtres.categorie !== 'Toutes') {
        const statutActuel =
          i.participant?.profil_professionnel?.[0]?.statut_actuel ?? 'Autre'

        if (statutActuel !== filtres.categorie) return false
      }
      if (
        filtres.formation !== 'Toutes' &&
        i.session?.formation?.titre !== filtres.formation
      )
        return false
      return true
    })
  }, [inscriptions, filtres])

  const presencesParFormation = useMemo(() => {
    const map = new Map<string, number>()
    filtrees.forEach((inscription) => {
      const titre = inscription.session?.formation?.titre ?? '—'
      const presences = inscription.presence ?? []
      const nombrePresences = presences.filter(
        (presence) =>
          presence.present === true || presence.statut === 'Présent',
      ).length

      map.set(titre, (map.get(titre) ?? 0) + nombrePresences)
    })
    return Array.from(map.entries()).map(([formation, presences]) => ({
      formation:
        formation.length > 22 ? `${formation.slice(0, 22)}…` : formation,
      presences,
    }))
  }, [filtrees])

  const beneficiaires = filtrees.filter((i) => i.statut === 'Acceptée')

  const participantsParFormationParMois = useMemo(() => {
    const formations = new Set<string>()

    filtrees.forEach((i) => {
      const titre = i.session?.formation?.titre
      if (titre) formations.add(titre)
    })

    return MOIS.map((mois, index) => {
      const ligne: Record<string, string | number> = {
        mois,
      }

      formations.forEach((titre) => {
        const participants = new Set<number>()

        filtrees.forEach((i) => {
          const date = new Date(i.date_inscription)

          if (
            date.getMonth() === index &&
            i.session?.formation?.titre === titre &&
            i.participant?.participant_id
          ) {
            participants.add(i.participant.participant_id)
          }
        })

        ligne[titre] = participants.size
      })

      return ligne
    })
  }, [filtrees])

  const parGenre = useMemo(() => {
    const compte = { Homme: 0, Femme: 0, 'Non renseigné': 0 }
    filtrees.forEach((i) => {
      const g = i.participant?.utilisateur?.genre
      if (g === 'Homme') compte.Homme += 1
      else if (g === 'Femme') compte.Femme += 1
      else compte['Non renseigné'] += 1
    })
    return Object.entries(compte)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [filtrees])

  const parSituationActuelle = useMemo(() => {
    const map = new Map<string, number>()

    filtrees.forEach((i) => {
      const statut =
        i.participant?.profil_professionnel?.[0]?.statut_actuel ?? 'Autre'

      map.set(statut, (map.get(statut) ?? 0) + 1)
    })

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  }, [filtrees])

  const tauxParticipation = useMemo(() => {
    const map = new Map<
      string,
      {
        inscrits: Set<number>
        presentsComplets: Set<number>
      }
    >()

    filtrees.forEach((i) => {
      const titre = i.session?.formation?.titre ?? '—'
      const participantId = i.participant?.participant_id

      if (participantId == null) return

      if (!map.has(titre)) {
        map.set(titre, {
          inscrits: new Set(),
          presentsComplets: new Set(),
        })
      }

      const ligne = map.get(titre)!
      ligne.inscrits.add(participantId)

      const presences = i.presence ?? []

      // Toutes les séances doivent avoir le statut « Présent ».
      const presenceComplete =
        presences.length > 0 && presences.every((p) => p.statut === 'Présent')

      if (presenceComplete) {
        ligne.presentsComplets.add(participantId)
      }
    })

    return Array.from(map.entries()).map(([formation, valeurs]) => ({
      formation:
        formation.length > 22 ? `${formation.slice(0, 22)}…` : formation,
      taux: valeurs.inscrits.size
        ? Math.round(
            (valeurs.presentsComplets.size / valeurs.inscrits.size) * 100,
          )
        : 0,
    }))
  }, [filtrees])

  const parMois = useMemo(() => {
    return MOIS.map((m, index) => {
      const duMois = filtrees.filter(
        (i) => new Date(i.date_inscription).getMonth() === index,
      )

      return {
        mois: m,
        inscrits: duMois.length,
        beneficiaires: duMois.filter((i) => i.statut === 'Acceptée').length,
      }
    })
  }, [filtrees])

  const tronquerNomFormation = (nom: string, longueur = 25) =>
    nom.length > longueur ? `${nom.slice(0, longueur)}…` : nom
  const selectClass =
    'h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Statistiques de suivi de l’activité de formation
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Année
          </span>
          <select
            className={selectClass}
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
          >
            <option>Toutes</option>
            {annees.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Mois
          </span>
          <select
            className={selectClass}
            value={mois}
            onChange={(e) => setMois(e.target.value)}
          >
            <option>Tous</option>
            {MOIS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Catégorie de participant
          </span>
          <select
            className={selectClass}
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
          >
            <option>Toutes</option>
            {STATUTS_ACTUELS.map((statut) => (
              <option key={statut}>{statut}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">
            Formation
          </span>
          <select
            className={selectClass}
            value={formation}
            onChange={(e) => setFormation(e.target.value)}
          >
            <option>Toutes</option>
            {formations.map((f) => (
              <option key={f.formation_id}>{f.titre}</option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setFiltres({ annee, mois, categorie, formation })}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Appliquer
        </button>
        <button
          onClick={() => {
            setAnnee('Toutes')
            setMois('Tous')
            setCategorie('Toutes')
            setFormation('Toutes')
            setFiltres({
              annee: 'Toutes',
              mois: 'Tous',
              categorie: 'Toutes',
              formation: 'Toutes',
            })
          }}
          className="flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SqueletteCartes nombre={5} />
          <SqueletteGraphiques nombre={6} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CarteDash
              titre="INSCRITS"
              valeur={filtrees.length}
              icone={Users}
            />
            <CarteDash
              titre="BÉNÉFICIAIRES"
              valeur={beneficiaires.length}
              icone={UserCheck}
            />
            <CarteDash
              titre="FORMATIONS"
              valeur={formations.length}
              icone={GraduationCap}
            />
            <CarteDash
              titre="FORMATEURS"
              valeur={data?.nbFormateurs ?? 0}
              icone={UsersRound}
            />
            <CarteDash
              titre="ATTESTATIONS"
              valeur={data?.nbAttestations ?? 0}
              icone={Award}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Bloc titre="Participants par formation">
              <ResponsiveContainer width="100%" height="100%">
                <Bloc titre="Participants par formation">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={participantsParFormationParMois}>
                      <defs>
                        <linearGradient
                          id="primaryGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#FF7900"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#FF7900"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />

                      <XAxis dataKey="mois" fontSize={12} stroke="#5F6368" />

                      <YAxis
                        fontSize={12}
                        stroke="#5F6368"
                        allowDecimals={false}
                      />

                      <Tooltip
                        formatter={(value, name) => [
                          `${value} participant${Number(value) > 1 ? 's' : ''}`,
                          tronquerNomFormation(String(name)),
                        ]}
                      />

                      {/* Légende volontairement simplifiée */}
                      <Legend
                        content={() => (
                          <div className="flex items-center justify-center gap-6 pt-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: '#FF7900' }}
                              />
                              <span>Formation</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: '#5F6368' }}
                              />
                              <span>Bénéficiaires</span>
                            </div>
                          </div>
                        )}
                      />

                      {/* Une courbe par formation */}
                      {Array.from(
                        new Set(
                          filtrees
                            .map((i) => i.session?.formation?.titre)
                            .filter((titre): titre is string => Boolean(titre)),
                        ),
                      ).map((titre) => (
                        <Area
                          key={titre}
                          type="monotone"
                          dataKey={titre}
                          name={titre}
                          stroke="FF7900"
                          fill="url(#primaryGradient)"
                          strokeWidth={2}
                          connectNulls
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </Bloc>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Inscrits et bénéficiaires par mois">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={parMois}>
                  <defs>
                    <linearGradient
                      id="inscritsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#FF7900"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="#FF7900"
                        stopOpacity={0.02}
                      />
                    </linearGradient>

                    <linearGradient
                      id="beneficiairesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#5F6368" stopOpacity={0.3} />
                      <stop
                        offset="100%"
                        stopColor="#5F6368"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />

                  <XAxis dataKey="mois" fontSize={12} stroke="#5F6368" />

                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />

                  <Tooltip />

                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="inscrits"
                    name="Inscrits"
                    stroke="#FF7900"
                    fill="url(#inscritsGradient)"
                    strokeWidth={2}
                    connectNulls
                  />

                  <Area
                    type="monotone"
                    dataKey="beneficiaires"
                    name="Bénéficiaires"
                    stroke="#5F6368"
                    fill="url(#beneficiairesGradient)"
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Présences par formation">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={presencesParFormation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis dataKey="formation" fontSize={11} stroke="#5F6368" />
                  <YAxis fontSize={12} stroke="#5F6368" allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="presences"
                    name="Présences"
                    fill="#FF7900"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Répartition par sexe">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={parGenre}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {parGenre.map((_, i) => (
                      <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Répartition par situation actuelle">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={parSituationActuelle}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {parSituationActuelle.map((_, i) => (
                      <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Bloc>

            <Bloc titre="Taux de participation par formation (%)">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tauxParticipation}
                  layout="vertical"
                  margin={{
                    left: 20,
                    right: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFF4FA" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    fontSize={12}
                    stroke="#5F6368"
                  />
                  <YAxis
                    type="category"
                    dataKey="formation"
                    width={120}
                    fontSize={11}
                    stroke="#5F6368"
                  />
                  <Tooltip formatter={(value) => [`${value}%`, 'Taux']} />
                  <Bar
                    dataKey="taux"
                    name="Taux (%)"
                    fill="#FF7900"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Bloc>
          </div>
        </>
      )}
    </div>
  )
}
